CREATE TABLE IF NOT EXISTS sport_competitions (
    competition_id INT AUTO_INCREMENT PRIMARY KEY,
    event_id INT NOT NULL,
    category_id INT NOT NULL,
    name VARCHAR(120) NOT NULL,
    round VARCHAR(60) NOT NULL DEFAULT 'Final',
    entry_size INT NOT NULL DEFAULT 1,
    scoring ENUM('Time','Distance','Points') NOT NULL,
    unit VARCHAR(20) NOT NULL,
    scheduled_time DATETIME NOT NULL,
    status ENUM('Scheduled','Ongoing','Completed') NOT NULL DEFAULT 'Scheduled',
    FOREIGN KEY (event_id) REFERENCES events(event_id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES sport_categories(category_id) ON DELETE RESTRICT
);
CREATE TABLE IF NOT EXISTS competition_entries (
    entry_id INT AUTO_INCREMENT PRIMARY KEY,
    competition_id INT NOT NULL,
    department_id INT NOT NULL,
    name VARCHAR(120) NOT NULL,
    result_value DECIMAL(12,4) NULL,
    result_status ENUM('Pending','Finished','DNS','DNF','DQ') NOT NULL DEFAULT 'Pending',
    FOREIGN KEY (competition_id) REFERENCES sport_competitions(competition_id) ON DELETE CASCADE,
    FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE RESTRICT
);
CREATE TABLE IF NOT EXISTS competition_entry_members (
    entry_id INT NOT NULL,
    competition_id INT NOT NULL,
    student_id INT NOT NULL,
    PRIMARY KEY (entry_id,student_id),
    UNIQUE KEY unique_competition_athlete (competition_id,student_id),
    FOREIGN KEY (entry_id) REFERENCES competition_entries(entry_id) ON DELETE CASCADE,
    FOREIGN KEY (competition_id) REFERENCES sport_competitions(competition_id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE RESTRICT
);
