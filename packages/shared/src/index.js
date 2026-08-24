/**
 * @hp/shared — domain types shared between the public site, the admin
 * control center and the API. Single source of truth for the data model.
 */
export * from "./schemas.js";
export const ACHIEVEMENTS = [
    { id: "boot", title: "SYSTEM INITIALIZED", description: "Completed the boot sequence." },
    { id: "explorer", title: "PROJECT EXPLORER", description: "Opened a project case study." },
    { id: "archivist", title: "CERTIFICATE ARCHIVIST", description: "Inspected a credential in the archive." },
    { id: "deepdive", title: "DEEP DIVE", description: "Read a project's engineering architecture." },
    { id: "ai", title: "AI INTERACTION", description: "Questioned the system intelligence." },
    { id: "signal", title: "SIGNAL SENT", description: "Transmitted a message through the contact interface." },
    { id: "operator", title: "OPERATOR DISCOVERED", description: "Found the local operator access point." },
];
//# sourceMappingURL=index.js.map