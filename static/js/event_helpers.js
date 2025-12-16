// Helper functions for saving event details to database
async function saveEventEquipment(db, eventId, equipmentList) {
    if (!equipmentList || !Array.isArray(equipmentList)) return;
    
    for (const equipment of equipmentList) {
        await db.execute_insert(
            "INSERT INTO event_equipment (event_id, equipment_name) VALUES (%s, %s)",
            (eventId, equipment)
        );
    }
}

async function saveEventActivities(db, eventId, activitiesList) {
    if (!activitiesList || !Array.isArray(activitiesList)) return;
    
    for (let idx = 0; idx < activitiesList.length; idx++) {
        await db.execute_insert(
            "INSERT INTO event_activities (event_id, activity_name, sequence_order) VALUES (%s, %s, %s)",
            (eventId, activitiesList[idx], idx)
        );
    }
}

async function saveBudgetBreakdown(db, eventId, breakdown) {
    if (!breakdown || typeof breakdown !== 'object') return;
    
    for (const [category, details] of Object.entries(breakdown)) {
        await db.execute_insert(
            "INSERT INTO budget_breakdown (event_id, category, amount, percentage) VALUES (%s, %s, %s, %s)",
            (eventId, category, details.amount || 0, details.percentage || 0)
        );
    }
}

async function getEventEquipment(db, eventId) {
    const rows = await db.execute_query(
        "SELECT equipment_name FROM event_equipment WHERE event_id = %s ORDER BY id",
        (eventId,)
    );
    return rows ? rows.map(r => r.equipment_name) : [];
}

async function getEventActivities(db, eventId) {
    const rows = await db.execute_query(
        "SELECT activity_name FROM event_activities WHERE event_id = %s ORDER BY sequence_order",
        (eventId,)
    );
    return rows ? rows.map(r => r.activity_name) : [];
}

async function getBudgetBreakdown(db, eventId) {
    const rows = await db.execute_query(
        "SELECT category, amount, percentage FROM budget_breakdown WHERE event_id = %s",
        (eventId,)
    );
    if (!rows) return {};
    
    const breakdown = {};
    for (const row of rows) {
        breakdown[row.category] = {
            amount: parseFloat(row.amount),
            percentage: parseFloat(row.percentage)
        };
    }
    return breakdown;
}

export { 
    saveEventEquipment, 
    saveEventActivities, 
    saveBudgetBreakdown,
    getEventEquipment,
    getEventActivities,
    getBudgetBreakdown
};
