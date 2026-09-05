import { getAllTeams, createTeam as createTeamSql, updateTeamStatus as updateTeamStatusSql, deleteTeam as deleteTeamSql } from '../models/sql/teamSqlModel.js';

export const getTeams = async (req, res, next) => {
    try {
        const data = await getAllTeams();
        return res.json({ success: true, data });
    } catch (err) {
        next(err);
    }
};

export const createTeam = async (req, res, next) => {
    try {
        const teamId = await createTeamSql(req.body);
        return res.status(201).json({ success: true, data: { team_id: teamId, ...req.body } });
    } catch (err) {
        next(err);
    }
};

export const updateTeamStatus = async (req, res, next) => {
    try {
        const success = await updateTeamStatusSql(req.params.id, req.body.status);
        if (!success) {
            return res.status(404).json({ success: false, error: { message: "Team not found" } });
        }
        return res.json({ success: true, data: { team_id: req.params.id, status: req.body.status } });
    } catch (err) {
        next(err);
    }
};

export const deleteTeam = async (req, res, next) => {
    try {
        const success = await deleteTeamSql(req.params.id);
        if (!success) {
            return res.status(404).json({ success: false, error: { message: "Team not found" } });
        }
        return res.json({ success: true, data: { message: "Team deleted successfully" } });
    } catch (err) {
        next(err);
    }
};
