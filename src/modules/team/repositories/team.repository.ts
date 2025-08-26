import prisma from "../../../config/database/client";
import { 
    CreateTeamInput,
    GetTeamInput,
    UpdateTeamInput,
    DeleteTeamInput 
    } from "../dtos";

    export class TeamRepository {
        async create(data: CreateTeamInput) {
            const team = await prisma.team.create({data });
            return team;
        }


        async getById(params: GetTeamInput) {
            const team = await prisma.team.findUnique({
                where: {
                    id: params.id
                }
            });
            return team;
        }

        async getAll(){
            const teams= await prisma.team.findMany();
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
                data: data
            });
            return team;
        }

        async delete(data: DeleteTeamInput) {
            const team = await prisma.team.delete({
                where: {
                    id: data.id
                }
            });
            return team;
        }
    }