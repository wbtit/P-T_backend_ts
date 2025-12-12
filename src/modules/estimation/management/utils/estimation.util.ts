import lineItems from "../../../../config/data/estimationLineItemsData";
import prisma from "../../../../config/database/client";

async function createEstimationLineItem(groupId:string) {
    if (!groupId) {
        console.error('groupId is not provided');
        return;
    }

    try {
        const lineItemsToInsert = lineItems.map(item => ({
            ...item,
            groupId:groupId
        }));

        const createItems = await prisma.estimationLineItem.createMany({
            data: lineItemsToInsert
        });

        console.log(" Line items inserted:", createItems);
        return createItems;

    } catch (error) {
        console.error("Error inserting line items:", error);
        throw error;
    }
}

export default createEstimationLineItem;
