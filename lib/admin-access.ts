/** An un-enrolled administrator may use setup and recovery, but no business data. */
export function canUseBusinessSession(user:{role:string;adminAuthenticatorEnabled?:boolean}) {
 return user.role !== "ADMIN" || user.adminAuthenticatorEnabled === true;
}
