import { TeamRepository } from "../repositories";
import { 
    CreateTeamInput,
    GetTeamInput,
    UpdateTeamInput,
    DeleteTeamInput,
    AddTeamMembersInput,
    UpdateRoleInput,
    TeamMemberRole,
    RemoveTeamMembersInput
    } from "../dtos";

const teamRepository = new TeamRepository();

export class TeamService {
    async create(data: CreateTeamInput) {
        return teamRepository.create(data);
    }
    async addTeamMembers(data: AddTeamMembersInput,role:TeamMemberRole) {
        return teamRepository.addTeamMembers(data,role);
    }
    async getById(data: GetTeamInput) {
        return teamRepository.getById(data);
    }

    async getAll() {
        return teamRepository.getAll();
    }

    async getByName(name: string) {
        return teamRepository.getByName(name);
    }

    async update(data: UpdateTeamInput) {
        return teamRepository.update(data);
    }

    async updateTeamRole(data: UpdateRoleInput) {
    return teamRepository.updateTeamRole(data);
}


    async delete(data: DeleteTeamInput) {
        return teamRepository.delete(data);
    }

    async removeTeamMembers(data: RemoveTeamMembersInput) {
        return teamRepository.removeTeamMembers(data);
    }
}