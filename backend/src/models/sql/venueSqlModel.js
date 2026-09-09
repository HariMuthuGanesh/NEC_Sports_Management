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
            is_external,
            COALESCE(college_name, 'National Engineering College') AS college_name,
            COALESCE(college_name, 'National Engineering College') AS collegeName,
            'Outdoor' AS type,
            incharge_user_id, 
            created_at
        FROM venues
        ORDER BY is_external ASC, name ASC
    `;
    const [rows] = await pool.execute(sql);
    return rows;
};

export const createVenue = async (venueData) => {
    const { 
        name, 
        location, 
        capacity, 
        status = 'Available', 
        incharge_user_id = null,
        is_external = 0,
        college_name = 'National Engineering College'
    } = venueData;
    const dbStatus = status === 'Under Maintenance' ? 'Maintenance' : (status === 'Occupied' || status === 'Closed') ? 'Booked' : 'Available';
    const sql = `
        INSERT INTO venues (name, location, capacity, status, incharge_user_id, is_external, college_name)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    const [result] = await pool.execute(sql, [
        name,
        location || '',
        Number(capacity) || 0,
        dbStatus,
        incharge_user_id,
        is_external ? 1 : 0,
        college_name || 'National Engineering College'
    ]);
    return result.insertId;
};

export const updateVenue = async (venueId, venueData) => {
    const { 
        name, 
        location, 
        capacity, 
        status = 'Available',
        is_external = 0,
        college_name = 'National Engineering College'
    } = venueData;
    const dbStatus = status === 'Under Maintenance' ? 'Maintenance' : (status === 'Occupied' || status === 'Closed') ? 'Booked' : 'Available';
    const sql = `
        UPDATE venues
        SET name = ?, location = ?, capacity = ?, status = ?, is_external = ?, college_name = ?
        WHERE venue_id = ?
    `;
    const [result] = await pool.execute(sql, [
        name,
        location || '',
        Number(capacity) || 0,
        dbStatus,
        is_external ? 1 : 0,
        college_name || 'National Engineering College',
        venueId
    ]);
    return result.affectedRows > 0;
};

export const deleteVenue = async (venueId) => {
    const sql = `DELETE FROM venues WHERE venue_id = ?`;
    const [result] = await pool.execute(sql, [venueId]);
    return result.affectedRows > 0;
};

