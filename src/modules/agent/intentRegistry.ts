import { TaskIntents } from "../task/agentIntents";
import { ProjectIntents } from "../project/agentIntents";


export const intentRegistry = {
  ...TaskIntents,
  ...ProjectIntents,


};
