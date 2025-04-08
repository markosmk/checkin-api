/** 10 hours */
export const EXPIRE_TIME_VERIFICATION = 1000 * 60 * 60 * 10 // or only 15min
/** 2 hours */
export const EXPIRE_TIME_RESET_PASSWORD = 1000 * 60 * 60 * 2
/** 5 min */
export const TIME_THROTTLE = 1000 * 60 * 5
/** 30 days */
export const TRIAL_PERIOD = 1000 * 60 * 60 * 24 * 30
/** 30 days in milliseconds **/
export const TIME_EXPIRE_SESSION = 1000 * 60 * 60 * 24 * 30
export const NAME_COOKIE_SESSION = "auth_app_session"
/** use veirifcation mail, if is false, user not need verify... maybe move to env */
export const VERIFY_EMAIL = true
