
import {CoResponseRepository} from "../repositories/coResponse.repository"

const res = new CoResponseRepository();
async function getResponses() {
    console.log(await res.getAll())
}
getResponses();