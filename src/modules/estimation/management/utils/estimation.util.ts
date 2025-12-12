import lineItems from "../../../../config/data/estimationLineItemsData";
import prisma from "../../../../config/database/client";

async function createEstimationLineItem(estimationTaskId:string) {
    if (!estimationTaskId) {
        console.error('estimationId is not provided');
        return;
    }

    try {
        const lineItemsToInsert = lineItems.map(item => ({
            ...item,
            estimationTaskId:estimationTaskId
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
