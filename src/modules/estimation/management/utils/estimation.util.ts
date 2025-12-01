import lineItems from "../../../../config/data/estimationLineItemsData";
import prisma from "../../../../config/database/client";

async function createEstimationLineItem(estimationId:string) {
    if (!estimationId) {
        console.error('❌ estimationId is not provided');
        return;
    }

    try {
        const lineItemsToInsert = lineItems.map(item => ({
            ...item,
            estimationId:estimationId
        }));

        const createItems = await prisma.estimationLineItem.createMany({
            data: lineItemsToInsert
        });

        console.log("✅ Line items inserted:", createItems);
        return createItems;

    } catch (error) {
        console.error("❌ Error inserting line items:", error);
        throw error;
    }
}

export default createEstimationLineItem;
