import prisma from "../../../config/database/client";

export const generateCoNUm=async()=>{
    const lastCoNum= await prisma.changeOrder.findFirst({
        orderBy:{createdAt:'desc'},
        select:{changeOrderNumber:true}
    })
    if(!lastCoNum){
        return 'CO-0001';
    }
    const lastNumber=parseInt(lastCoNum.changeOrderNumber.split('-')[1]);
    const newNumber=lastNumber+1;
    const newCoNum=`CO-${newNumber.toString().padStart(4,'0')}`;
    return newCoNum;
}