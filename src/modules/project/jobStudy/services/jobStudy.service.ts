import { getJobStudyInput,JobStudyRequestInput, JobStudyUpdateInput } from "../dtos";
import { JobStudyRepository } from "../Repositories";


const jobStudyRepository= new JobStudyRepository();

export class JobStudyService{
    async create(data: JobStudyRequestInput) {
        return jobStudyRepository.create(data);
    }

    async update(id: string, data: JobStudyUpdateInput) {
        return jobStudyRepository.update(id, data);
    }

    async findByProjectId(params: getJobStudyInput) {
        return jobStudyRepository.findByProjectId(params);
    }
}