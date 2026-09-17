CREATE TABLE IF NOT EXISTS match_attendance (
    attendance_id INT PRIMARY KEY AUTO_INCREMENT,
    team_id       INT NOT NULL,
    match_id      INT NULL,
    student_id    INT NOT NULL,
    marked_by     INT NOT NULL,
    status        ENUM('Present','Absent') NOT NULL DEFAULT 'Present',
    recorded_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (team_id)    REFERENCES teams(team_id)       ON DELETE CASCADE,
    FOREIGN KEY (match_id)   REFERENCES matches(match_id)    ON DELETE SET NULL,
    FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE,
    FOREIGN KEY (marked_by)  REFERENCES users(id)            ON DELETE RESTRICT
);

