import { db } from '../firebase-config.js';
import { collection, getDocs, query, where, orderBy, doc, updateDoc, Timestamp, addDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { AuditService } from '../services/audit-service.js';

export async function render(container, user) {
    console.log("Rendering Sector View for User:", user);

    // Map user role to database sector key
    const currentSectorKey = user.role;
    console.log("Current Sector Key being queried:", currentSectorKey);

    container.innerHTML = `
        <h2>Painel do Setor: ${user.sector || currentSectorKey}</h2>
        <p class="text-secondary">Fichas encaminhadas para este setor.</p>

        <div class="card mt-3">
            <div class="d-flex justify-content-between mb-3" style="display: flex; justify-content: space-between;">
                <h3>Fichas em Aberto</h3>
                <button class="btn btn-sm btn-outline-primary" id="btnRefresh">Atualizar</button>
            </div>
            
            <div class="table-responsive">
                <table class="table" style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr style="text-align: left; background: #f8f9fa;">
                            <th style="padding: 10px;">Cidadão</th>
                            <th style="padding: 10px;">CPF</th>
                            <th style="padding: 10px;">Assunto</th>
                            <th style="padding: 10px;">Data Encaminhamento</th>
                            <th style="padding: 10px;">Ações</th>
                        </tr>
                    </thead>
                    <tbody id="sectorTableBody">
                        <tr><td colspan="5" class="text-center">Carregando...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>

        <!-- Detail Modal (Hidden) -->
        <div id="fichaModal" style="display:none; position: fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); overflow-y: auto; z-index: 1000;">
            <div class="card" style="width: 90%; max-width: 600px; margin: 30px auto; padding: 20px;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <h3 id="modalTitle">Atendimento</h3>
                    <button id="btnCloseModal" class="btn btn-sm btn-secondary">X</button>
                </div>
                <hr>
                <div id="modalContent"></div>
                
                <hr class="mt-3">
                <h4>Novo Procedimento / Evolução</h4>
                <form id="procedureForm">
                    <input type="hidden" id="currentFichaId">
                    <div class="form-group">
                        <label class="form-label">Descrição do Procedimento</label>
                        <textarea id="procDesc" class="form-control" rows="3" required placeholder="Descreva o atendimento realizado..."></textarea>
                    </div>
                    <div style="display:flex; gap: 10px; justify-content: flex-end;">
                        <button type="submit" class="btn btn-primary">Registrar Procedimento</button>
                        <button type="button" id="btnConclude" class="btn btn-success">Finalizar Ficha</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    loadSectorFichas(currentSectorKey, user);

    // Event Listeners
    document.getElementById('btnRefresh').addEventListener('click', () => loadSectorFichas(currentSectorKey, user));
    document.getElementById('btnCloseModal').addEventListener('click', () => {
        document.getElementById('fichaModal').style.display = 'none';
    });

    // Handle Procedure Submit
    document.getElementById('procedureForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const fichaId = document.getElementById('currentFichaId').value;
        const desc = document.getElementById('procDesc').value;
        await addProcedure(fichaId, desc, user, false);
    });

    // Handle Conclusion
    document.getElementById('btnConclude').addEventListener('click', async () => {
        if (!confirm("Deseja realmente finalizar esta ficha?")) return;
        const fichaId = document.getElementById('currentFichaId').value;
        const desc = document.getElementById('procDesc').value;

        let finalDesc = desc;
        if (!finalDesc.trim()) {
            finalDesc = "Atendimento finalizado/concluído.";
        }

        await addProcedure(fichaId, finalDesc, user, true);
    });
}

async function loadSectorFichas(sectorKey, currentUser) {
    const tbody = document.getElementById('sectorTableBody');
    tbody.innerHTML = '<tr><td colspan="5" class="text-center">Carregando...</td></tr>';

    try {
        console.log(`Searching for fichas with targetSector == "${sectorKey}" and status == "Aberta"`);
        const q = query(
            collection(db, "fichas"),
            where("targetSector", "==", sectorKey),
            where("status", "==", "Aberta")
        );

        const querySnapshot = await getDocs(q);
        console.log("Query Results found:", querySnapshot.size);

        if (querySnapshot.empty) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center">Nenhuma ficha pendente para este setor.</td></tr>';
            return;
        }

        tbody.innerHTML = '';
        querySnapshot.forEach((docSnap) => {
            const f = docSnap.data();
            const date = f.createdAt ? new Date(f.createdAt.seconds * 1000).toLocaleString() : 'N/A';

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="padding: 10px;">${f.citizenName}</td>
                <td style="padding: 10px;">${f.citizenCPF}</td>
                <td style="padding: 10px;">${f.subject}</td>
                <td style="padding: 10px;">${date}</td>
                <td style="padding: 10px;">
                    <button class="btn btn-sm btn-primary" onclick="openFicha('${docSnap.id}')">Atender</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (e) {
        console.error("Error loading sector fichas:", e);
        if (e.message.includes("requires an index")) {
            tbody.innerHTML = `<tr><td colspan="5" style="color:red; font-size: 0.8rem;">Erro: Este filtro requer um índice no Firestore. Link no console.</td></tr>`;
        } else {
            tbody.innerHTML = `<tr><td colspan="5" style="color:red">Erro: ${e.message}</td></tr>`;
        }
    }
}

async function addProcedure(fichaId, description, user, conclude = false) {
    try {
        const fichaRef = doc(db, "fichas", fichaId);

        await addDoc(collection(db, "fichas", fichaId, "procedures"), {
            description: description,
            type: conclude ? 'Conclusão' : 'Atendimento',
            timestamp: Timestamp.now(),
            createdBy: user.name || user.email
        });

        if (conclude) {
            await updateDoc(fichaRef, {
                status: 'Concluída',
                updatedAt: Timestamp.now()
            });

            await AuditService.logChanges(fichaId, user.name || user.email, [
                { field: "Status", oldVal: "Aberta", newVal: "Concluída" }
            ]);

            alert('Ficha concluída com sucesso!');
        } else {
            alert('Procedimento registrado!');
        }

        document.getElementById('fichaModal').style.display = 'none';
        document.getElementById('procedureForm').reset();
        loadSectorFichas(user.role, user);

    } catch (e) {
        alert('Erro ao salvar: ' + e.message);
    }
}

// Global scope hack
window.openFicha = async (id) => {
    try {
        const docSnap = await getDoc(doc(db, "fichas", id));
        if (!docSnap.exists()) return;
        const f = docSnap.data();

        document.getElementById('currentFichaId').value = id;
        document.getElementById('modalTitle').textContent = `Atendendo: ${f.citizenName}`;
        document.getElementById('modalContent').innerHTML = `
            <p><strong>CPF:</strong> ${f.citizenCPF}</p>
            <p><strong>Assunto:</strong> ${f.subject}</p>
            <p><strong>Endereço:</strong> ${f.address?.street}, ${f.address?.neighborhood}</p>
            <p><strong>Status:</strong> ${f.status}</p>
        `;

        document.getElementById('fichaModal').style.display = 'block';
    } catch (e) {
        alert("Erro ao abrir ficha: " + e.message);
    }
};
