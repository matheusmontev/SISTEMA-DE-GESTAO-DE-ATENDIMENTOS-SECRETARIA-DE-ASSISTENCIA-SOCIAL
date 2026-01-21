import { db } from '../firebase-config.js';
import { collection, addDoc, getDocs, query, where, Timestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const FICHAS_COLLECTION = 'fichas';

export const FichaService = {
    // Create a new Ficha
    async createFicha(fichaData, createdByUserId) {
        try {
            // REMOVED: Duplication Check (CPF) - User wants to allow multiple records per CPF
            /*
            const q = query(collection(db, FICHAS_COLLECTION), where("citizenCPF", "==", fichaData.citizenCPF));
            const existing = await getDocs(q);
            if (!existing.empty) {
                throw new Error("CPF já cadastrado no sistema!");
            }
            */

            const docRef = await addDoc(collection(db, FICHAS_COLLECTION), {
                ...fichaData,
                status: 'Aberta',
                createdAt: Timestamp.now(),
                createdBy: createdByUserId,
                history: [
                    {
                        action: 'Criação',
                        details: 'Ficha criada na recepção',
                        timestamp: Timestamp.now(),
                        user: createdByUserId
                    }
                ]
            });
            return docRef.id;
        } catch (error) {
            console.error("Error creating ficha:", error);
            throw error;
        }
    },

    // Get latest ficha data for autofill
    async getLatestFicha(cpf) {
        try {
            const q = query(
                collection(db, FICHAS_COLLECTION),
                where("citizenCPF", "==", cpf),
                // orderBy("createdAt", "desc"), // Requires index, let's do client side sort if needed or just take first found for now
            );
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) return null;

            // Simple client-side sort to get latest without creating index immediately
            let docs = [];
            querySnapshot.forEach(doc => docs.push(doc.data()));

            docs.sort((a, b) => b.createdAt - a.createdAt);
            return docs[0];
        } catch (error) {
            console.error("Error fetching latest ficha:", error);
            return null;
        }
    },

    // Validate CPF Format (Simple Regex)
    isValidCPF(cpf) {
        // Standard Regex for XXX.XXX.XXX-XX
        const regex = /^\d{3}\.\d{3}\.\d{3}\-\d{2}$/;
        return regex.test(cpf);
    }
};
