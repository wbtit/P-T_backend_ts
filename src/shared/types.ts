import { JwtPayload } from "jsonwebtoken";
interface UserJwt extends JwtPayload{
    id:string;
    email:string;
    role:'USER'|'ADMIN'|'MODERATOR'
}
export {UserJwt}