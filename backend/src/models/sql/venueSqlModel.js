import pool from '../../config/db.js';

export const getAllVenues = async () => {
    const sql = `
        SELECT 
            venue_id, 
            venue_id AS id, 
            name, 
            location, 
            COALESCE(capacity, 0) AS capacity, 
            status, 
            'Outdoor' AS type,
            incharge_user_id, 
            created_at
        FROM venues
        ORDER BY name ASC
    `;
    const [rows] = await pool.execute(sql);
    return rows;
};

export const createVenue = async (venueData) => {
    const { name, location, capacity, status = 'Available', incharge_user_id = null } = venueData;
    const dbStatus = status === 'Under Maintenance' ? 'Maintenance' : (status === 'Occupied' || status === 'Closed') ? 'Booked' : 'Available';
    const sql = `
        INSERT INTO venues (name, location, capacity, status, incharge_user_id)
        VALUES (?, ?, ?, ?, ?)
    `;
    const [result] = await pool.execute(sql, [
        name,
        location || '',
        Number(capacity) || 0,
        dbStatus,
        incharge_user_id
    ]);
    return result.insertId;
};

export const updateVenue = async (venueId, venueData) => {
    const { name, location, capacity, status = 'Available' } = venueData;
    const dbStatus = status === 'Under Maintenance' ? 'Maintenance' : (status === 'Occupied' || status === 'Closed') ? 'Booked' : 'Available';
    const sql = `
        UPDATE venues
        SET name = ?, location = ?, capacity = ?, status = ?
        WHERE venue_id = ?
    `;
    const [result] = await pool.execute(sql, [
        name,
        location || '',
        Number(capacity) || 0,
        dbStatus,
        venueId
    ]);
    return result.affectedRows > 0;
};

export const deleteVenue = async (venueId) => {
    const sql = `DELETE FROM venues WHERE venue_id = ?`;
    const [result] = await pool.execute(sql, [venueId]);
    return result.affectedRows > 0;
};
