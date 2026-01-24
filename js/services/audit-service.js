import { db } from '../firebase-config.js';
import { collection, addDoc, Timestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

export const AuditService = {
    /**
     * Records an audit log for a change.
     * @param {string} fichaId - The ID of the ficha being modified.
     * @param {string} username - Name of the user making the change.
     * @param {Array} changes - Array of { field, oldVal, newVal }
     */
    async logChanges(fichaId, username, changes, subject = "N/A") {
        if (!changes || changes.length === 0) return;

        try {
            const auditRef = collection(db, "audit_history");

            for (const change of changes) {
                await addDoc(auditRef, {
                    fichaId: fichaId,
                    field: change.field,
                    oldValue: change.oldVal || "Vazio",
                    newValue: change.newVal || "Vazio",
                    user: username,
                    subject: subject,
                    timestamp: Timestamp.now()
                });
            }
        } catch (error) {
            console.error("Erro ao registrar auditoria:", error);
        }
    }
};
