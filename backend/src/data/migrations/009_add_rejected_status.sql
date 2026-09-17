ALTER TABLE teams MODIFY COLUMN status ENUM('Pending','Approved','Rejected','Disqualified') DEFAULT 'Pending';
