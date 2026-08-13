import { useState, useEffect, useLayoutEffect, useRef, useReducer, useMemo, useCallback } from "react";
import { useSettings } from "./SettingsContext";
import "./StudentForm.css";

// Reducer for managing form state
const formReducer = (state, action) => {
    switch (action.type) {
        case 'setField':
            return { ...state, [action.field]: action.value };
        case 'reset':
            return { roll: "", name: "", password: "" };
        default:
            return state;
    }
};

// Bug fix: accept onLogin callback so parent (App) can switch to Dashboard on success
function StudentForm({ onLogin }) {
    // Global settings (theme + language via SettingsContext)
    const { theme, t } = useSettings();

    // 1. useReducer for complex state management (replacing multiple useStates)
    const [formState, dispatch] = useReducer(formReducer, {
        roll: "",
        name: "",
        password: ""
    });

    // 2. useState for mouse parallax
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

    // 3. useRef for DOM elements
    const rollInputRef = useRef(null);

    useLayoutEffect(() => {
        rollInputRef.current?.focus();
    }, []);

    // 4. useEffect for mouse event listener
    useEffect(() => {
        const handleMouseMove = (e) => {
            setMousePos({ x: e.clientX, y: e.clientY });
        };
        window.addEventListener("mousemove", handleMouseMove);
        return () => window.removeEventListener("mousemove", handleMouseMove);
    }, []);

    // 5. useMemo for expensive calculations or derived state
    const isFormValid = useMemo(() => {
        return formState.roll.trim() && formState.name.trim() && formState.password.trim();
    }, [formState.roll, formState.name, formState.password]);

    // 6. useCallback to memoize functions
    const handleSubmit = useCallback((event) => {
        event.preventDefault();

        if (!isFormValid) {
            rollInputRef.current?.focus();
            return;
        }

        console.log("Roll Number:", formState.roll);
        console.log("Name:", formState.name);
        console.log("Password:", formState.password);

        // Bug fix: call the onLogin callback so App can navigate to Dashboard
        if (typeof onLogin === "function") onLogin();
    }, [isFormValid, formState, onLogin]);

    const handleFieldChange = useCallback((field, value) => {
        dispatch({ type: 'setField', field, value });
    }, []);

    return (
        <div className={`form-container ${theme}`}>
            <div className="background-shapes">
                <div className="shape shape-1" style={{ transform: `translate(${mousePos.x * 0.02}px, ${mousePos.y * 0.02}px)` }}></div>
                <div className="shape shape-2" style={{ transform: `translate(${mousePos.x * -0.02}px, ${mousePos.y * -0.02}px)` }}></div>
                <div className="shape shape-3" style={{ transform: `translate(${mousePos.x * 0.01}px, ${mousePos.y * -0.01}px)` }}></div>
            </div>

            <div className="card glass-effect">
                <div className="card-header">
                    <div className="logo-placeholder">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" /></svg>
                    </div>
                    <h2>{t.sportsPortal}</h2>
                    <p className="subtitle">{t.signIn}</p>
                </div>

                <form onSubmit={handleSubmit} className="login-form">
                    <div className="input-group">
                        <label>{t.rollNumber}</label>
                        <div className="input-wrapper">
                            <svg className="input-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                            <input
                                ref={rollInputRef}
                                type="text"
                                placeholder={t.rollPlaceholder}
                                value={formState.roll}
                                onChange={(e) => handleFieldChange('roll', e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <div className="input-group">
                        <label>{t.fullName}</label>
                        <div className="input-wrapper">
                            <svg className="input-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                            <input
                                type="text"
                                placeholder={t.namePlaceholder}
                                value={formState.name}
                                onChange={(e) => handleFieldChange('name', e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <div className="input-group">
                        <label>{t.password}</label>
                        <div className="input-wrapper">
                            <svg className="input-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                            <input
                                type="password"
                                placeholder={t.passwordPlaceholder}
                                value={formState.password}
                                onChange={(e) => handleFieldChange('password', e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <button type="submit" className={`submit-btn ${isFormValid ? 'primary-glow' : 'disabled'}`} disabled={!isFormValid}>
                        {t.login}
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
                    </button>

                    <div className="form-footer">
                        <p>{t.noAccount} <a href="#register" className="link">{t.register}</a></p>
                    </div>
                </form>

                {(formState.roll || formState.name || formState.password) ? (
                    <div className="info-badge glass-panel">
                        <div className="info-item">
                            <span className="info-label">{t.roll}</span>
                            <span className="info-value">{formState.roll || '-'}</span>
                        </div>
                        <div className="info-item">
                            <span className="info-label">{t.name}</span>
                            <span className="info-value">{formState.name || '-'}</span>
                        </div>
                        <div className="info-item">
                            <span className="info-label">{t.pass}</span>
                            <span className="info-value">{formState.password ? '••••••••' : '-'}</span>
                        </div>
                    </div>
                ) : null}
            </div>
        </div>
    );
}

export default StudentForm;