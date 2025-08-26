import prisma from "../../../config/database/client";
import { 
    CreateTeamInput,
    GetTeamInput,
    UpdateTeamInput,
    DeleteTeamInput, 
    AddTeamMembersInput,
    TeamMemberRole,
    RemoveTeamMembersInput,
    UpdateRoleInput
    } from "../dtos";

    export class TeamRepository {
        async create(data: CreateTeamInput) {
            const team = await prisma.team.create({data });
            return team;
        }

        async addTeamMembers(data: AddTeamMembersInput,role:TeamMemberRole) {
            const {teamId,userId}=data;
            const team= await prisma.teamMember.create({
                data: {
                    teamId,
                    userId,
                    role
                }
            });
            return team;
        }

        async getById(params: GetTeamInput) {
            const team = await prisma.team.findUnique({
                where: {
                    id: params.id
                },
                include:{
                    department:true,
                    members:true,
                    project:true
                }
            });
            return team;
        }

        async getAll(){
            const teams= await prisma.team.findMany({
                include:{
                    department:true,
                    members:true,
                    project:true
                }
            });
            return teams;
        }

        async getByName(name: string){
            const team = await prisma.team.findMany({
                where: {
                    name: {
                        contains: name,
                        mode: "insensitive"
                    }
                }
            });
            return team;
        }
        async update(data: UpdateTeamInput) {
            const team = await prisma.team.update({
                where: {
                    id: data.id
                },
                data: data,
                include:{
                    department:true,
                    members:true,
                    project:true
                }
            });
            return team;
        }

        async updateTeamRole(data: UpdateRoleInput) {
            const { teamId, userId, newRole } = data;
            return prisma.teamMember.update({
                where: {
                    teamId_userId: {
                        teamId,
                        userId
                    }
                },
                data: {
                    role: data.newRole as TeamMemberRole
                }
            });
        }


        async delete(data: DeleteTeamInput) {
            const team = await prisma.team.update({
                where: {
                    id: data.id
                },
                data: {
                    isDeleted: false
                }
            });
            return team;
        }

        async removeTeamMembers(data: RemoveTeamMembersInput) {
            const {teamId,userId}=data;
            const team= await prisma.teamMember.delete({
                where: {
                    teamId_userId: {
                        teamId,
                        userId
                    }
                }
            });
            return team;
        }
    }