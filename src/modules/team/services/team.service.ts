import { TeamRepository } from "../repositories";
import { 
    CreateTeamInput,
    GetTeamInput,
    UpdateTeamInput,
    DeleteTeamInput 
    } from "../dtos";

const teamRepository = new TeamRepository();

export class TeamService {
    async create(data: CreateTeamInput) {
        return teamRepository.create(data);
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

    async delete(data: DeleteTeamInput) {
        return teamRepository.delete(data);
    }
}