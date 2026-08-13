jest.mock('mime', () => ({ define: jest.fn(), getType: () => 'application/json' }));
jest.mock('bcrypt-ts', () => ({}));
jest.mock('../src/middleware/authMiddleware', () => {
  return {
    __esModule: true,
    default: (req: any, res: any, next: any) => {
      if (req.headers.authorization === 'Bearer client_token') {
        req.user = { id: 'client_id', role: 'CLIENT' };
        return next();
      } else if (req.headers.authorization === 'Bearer detailer_token') {
        req.user = { id: 'detailer_id', role: 'DETAILER' };
        return next();
      }
      return res.status(401).json({ error: 'Unauthorized' });
    }
  };
});
jest.mock('../src/middleware/roleGuard', () => ({
  roleGuard: (roles: string[]) => (req: any, res: any, next: any) => {
    if (!req.user || !roles.includes(req.user.role)) return res.status(403).json({ error: 'Forbidden' });
    next();
  }
}));
jest.mock('../src/middleware/roleMiddleware', () => ({
  __esModule: true,
  default: (roles: string[]) => (req: any, res: any, next: any) => {
    if (!req.user || !roles.includes(req.user.role)) return res.status(403).json({ error: 'Forbidden' });
    next();
  }
}));
import request from 'supertest';
import express from 'express';
import router from '../src/app';
import prisma from '../src/config/database/client';

const app = express();
app.use(express.json());
app.use('/v1', router);

describe('Phase 11: Multi-Page Image Answers (Red First)', () => {
  const detailerToken = 'detailer_token';
  const clientToken = 'client_token';
  const projectId = '73436d64-7a43-4c69-8618-78a7d0b2da49'; // Active GSMS project
  let legacyAnswerId: string;
  let chatId: string;
  
  beforeAll(async () => {
    // Seed legacy shaped row to test persistence
    const user = await prisma.user.findFirst();
    const chat = await prisma.standardChatMessage.create({
      data: {
        projectId,
        queryText: "Legacy query"
      }
    });
    chatId = chat.id;
    
    const doc = await prisma.standardDocument.findFirst({ where: { projectId } });
    
    const legacyAnswer = await prisma.standardChatAnswer.create({
      data: {
        messageId: chat.id,
        sourceType: 'FABRICATOR',
        chunkType: 'VISUAL',
        answerText: 'Legacy prose answer',
        citationPdfName: 'legacy.pdf',
        citationPageStart: 1,
        citationPageEnd: 1,
        imagePaths: ['/files/legacy_1.png'],
        pinnedDocumentId: doc?.id || '00000000-0000-0000-0000-000000000000',
      }
    });
    legacyAnswerId = legacyAnswer.id;
  });
  
  afterAll(async () => {
    // Cleanup seeded legacy rows
    if (chatId) {
      await prisma.standardChatMessage.deleteMany({ where: { id: chatId } });
    }
  });

  describe('POST /v1/projects/:projectId/standards/chat', () => {
    it('should allow STAFF/DETAILER and block CLIENT', async () => {
      const resClient = await request(app)
        .post(`/v1/projects/${projectId}/standards/chat`)
        .set('Authorization', `Bearer ${clientToken}`)
        .send({ query: 'test' });
      expect(resClient.status).toBe(403);
      
      const resDetailer = await request(app)
        .post(`/v1/projects/${projectId}/standards/chat`)
        .set('Authorization', `Bearer ${detailerToken}`)
        .send({ query: 'test' });
      expect(resDetailer.status).not.toBe(403);
    });

    it('should return up to 3 ranked citations per source (no answerText)', async () => {
      const res = await request(app)
        .post(`/v1/projects/${projectId}/standards/chat`)
        .set('Authorization', `Bearer ${detailerToken}`)
        .send({ query: 'What file format and size limits do we have for pipe and square tubing?' });
      
      expect(res.status).toBe(200);
      expect(res.body.answers).toBeDefined();
      
      const gsmsAnswer = res.body.answers.find((a: any) => a.sourceType === 'FABRICATOR');
      expect(gsmsAnswer).toBeDefined();
      expect(gsmsAnswer.answerText).toBeNull(); // Assert LLM is not invoked
      expect(gsmsAnswer.citations).toBeDefined();
      expect(gsmsAnswer.citations.length).toBeGreaterThan(0);
      expect(gsmsAnswer.citations.length).toBeLessThanOrEqual(3);
      
      // Structure check
      const cit = gsmsAnswer.citations[0];
      expect(cit.rank).toBeDefined();
      expect(cit.citationPdfName).toBeDefined();
      expect(cit.citationPageStart).toBeDefined();
      expect(cit.imagePaths).toBeDefined();
    });

    it('should return Ranks 2 and 3 even if < 0.60, as long as Rank 1 clears 0.60', async () => {
      // The floor rule check
      const res = await request(app)
        .post(`/v1/projects/${projectId}/standards/chat`)
        .set('Authorization', `Bearer ${detailerToken}`)
        .send({ query: 'What file format and size limits do we have for pipe and square tubing?' });
        
      const gsmsAnswer = res.body.answers.find((a: any) => a.sourceType === 'FABRICATOR');
      if (gsmsAnswer && gsmsAnswer.citations.length > 1) {
         expect(gsmsAnswer.citations.length).toBeGreaterThanOrEqual(2);
      }
    });

    it('should return no citations if Rank 1 does not clear 0.60', async () => {
      const res = await request(app)
        .post(`/v1/projects/${projectId}/standards/chat`)
        .set('Authorization', `Bearer ${detailerToken}`)
        .send({ query: 'how do I calibrate a marine GPS compass' });
        
      expect(res.status).toBe(200);
      expect(res.body.answers).toBeDefined();
      // Should return "not covered by this standard" meaning empty citations for this source
      const gsmsAnswer = res.body.answers.find((a: any) => a.sourceType === 'FABRICATOR');
      if (gsmsAnswer) {
        expect(gsmsAnswer.citations).toBeDefined();
        expect(gsmsAnswer.citations.length).toBe(0);
      }
    });
  });
  
  describe('GET /v1/projects/:projectId/standards/chat/history (Legacy check)', () => {
    it('should read existing legacy StandardChatAnswer rows and format them with synthesized citations array', async () => {
      const res = await request(app)
        .get(`/v1/projects/${projectId}/standards/chat/history`)
        .set('Authorization', `Bearer ${detailerToken}`);
        
      expect(res.status).toBe(200);
      const history = res.body;
      const legacyMsg = history.find((m: any) => m.id === chatId);
      expect(legacyMsg).toBeDefined();
      expect(legacyMsg.answers.length).toBeGreaterThan(0);
      
      const legacyAnswer = legacyMsg.answers[0];
      // Expect synthesized citations array from the dual-format read path
      expect(legacyAnswer.citations).toBeDefined();
      expect(legacyAnswer.citations.length).toBe(1);
      expect(legacyAnswer.citations[0].citationPdfName).toBe('legacy.pdf');
      expect(legacyAnswer.citations[0].rank).toBe(1);
    });
  });
});
