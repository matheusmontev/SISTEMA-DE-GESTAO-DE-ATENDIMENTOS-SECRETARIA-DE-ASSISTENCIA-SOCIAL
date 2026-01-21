import { db } from '../firebase-config.js';
import { collection, getDocs, doc, updateDoc, setDoc, getDoc, query, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { AuditService } from '../services/audit-service.js';
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { UserService } from '../services/user-service.js';
import { getAuth as getAuth2, createUserWithEmailAndPassword as createUser2 } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

export async function render(container, adminUser) {
    container.innerHTML = `
        <h2>Painel Administrativo - Gestão Geral</h2>
        
        <!-- User Management -->
        <div class="card mt-3">
            <div class="d-flex justify-content-between mb-3" style="display: flex; justify-content: space-between; align-items: center;">
                <h3>Usuários do Sistema</h3>
                <button id="btnNewUser" class="btn btn-success">+ Novo Usuário</button>
            </div>
            <div class="table-responsive">
                <table class="table" style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr style="text-align: left; background: #f8f9fa;">
                            <th style="padding: 10px;">Nome</th>
                            <th style="padding: 10px;">Login</th>
                            <th style="padding: 10px;">Função</th>
                            <th style="padding: 10px;">Status</th>
                            <th style="padding: 10px;">Ações</th>
                        </tr>
                    </thead>
                    <tbody id="usersTableBody">
                        <tr><td colspan="5" class="text-center">Carregando...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>

        <!-- Ficha Management -->
        <h2 class="mt-5">Visão Geral - Atendimentos</h2>
        <div class="card mt-3">
            <h3>Todas as Fichas</h3>
            <div class="table-responsive">
                <table class="table" style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr style="text-align: left; background: #f8f9fa;">
                            <th style="padding: 10px;">Cidadão</th>
                            <th style="padding: 10px;">CPF</th>
                            <th style="padding: 10px;">Setor Atual</th>
                            <th style="padding: 10px;">Data Criação</th>
                            <th style="padding: 10px;">Status</th>
                            <th style="padding: 10px;">Ações</th>
                        </tr>
                    </thead>
                    <tbody id="allFichasTableBody">
                        <tr><td colspan="6" class="text-center">Carregando fichas...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>

        <!-- Add User Modal -->
        <div id="userModal" style="display:none; position: fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); z-index: 1001;">
            <div class="card" style="width: 400px; margin: 50px auto; padding: 20px;">
                <h3>Novo Usuário</h3>
                <form id="newUserForm">
                    <div class="form-group">
                        <label>Nome Completo</label>
                        <input type="text" id="newUserName" class="form-control" required>
                    </div>
                    <div class="form-group">
                        <label>Nome de Usuário (Login)</label>
                        <input type="text" id="newUserLogin" class="form-control" placeholder="ex: psicologia1" required>
                    </div>
                    <div class="form-group">
                        <label>Senha Inicial</label>
                        <input type="password" id="newUserPass" class="form-control" required minlength="6">
                    </div>
                    <div class="form-group">
                        <label>Função / Setor</label>
                        <select id="newUserRole" class="form-control" required>
                            <option value="recepcao">Recepção</option>
                            <option value="bolsa_familia">Bolsa Família</option>
                            <option value="crianca_feliz">Criança Feliz</option>
                            <option value="psicologia">Psicologia</option>
                            <option value="admin">Administrador (Chefe)</option>
                        </select>
                    </div>
                    <div class="mt-3 text-right" style="display:flex; gap:10px; justify-content:flex-end;">
                        <button type="button" id="btnCancelUserModal" class="btn btn-secondary">Cancelar</button>
                        <button type="submit" class="btn btn-primary">Salvar</button>
                    </div>
                </form>
            </div>
        </div>

        <!-- Edit Ficha Modal -->
        <div id="editFichaModal" style="display:none; position: fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); overflow-y: auto; z-index: 1000;">
            <div class="card" style="width: 95%; max-width: 600px; margin: 30px auto; padding: 20px;">
                <div style="display:flex; justify-content:space-between;">
                    <h3>Editar Dados / Auditoria</h3>
                    <button type="button" id="btnCloseEditModal" class="btn btn-sm btn-secondary">X</button>
                </div>
                <hr>
                <form id="editFichaForm">
                    <input type="hidden" id="editFichaId">
                    <div class="form-group">
                        <label>Nome do Cidadão</label>
                        <input type="text" id="editCitizenName" class="form-control" required>
                    </div>
                    <div class="form-group">
                        <label>CPF</label>
                        <input type="text" id="editCitizenCPF" class="form-control" required>
                    </div>
                    <div style="display:flex; gap:10px;">
                        <div style="flex:1" class="form-group">
                            <label>Bairro</label>
                            <input type="text" id="editNeighborhood" class="form-control" required>
                        </div>
                        <div style="flex:2" class="form-group">
                            <label>Rua/Endereço</label>
                            <input type="text" id="editStreet" class="form-control" required>
                        </div>
                    </div>
                    <div style="display:flex; gap:10px;">
                        <div style="flex:1" class="form-group">
                            <label>Setor Atual</label>
                            <select id="editTargetSector" class="form-control" required>
                                <option value="bolsa_familia">Bolsa Família</option>
                                <option value="crianca_feliz">Criança Feliz</option>
                                <option value="psicologia">Psicologia</option>
                            </select>
                        </div>
                        <div style="flex:1" class="form-group">
                            <label>Status</label>
                            <select id="editStatus" class="form-control" required>
                                <option value="Aberta">Aberta</option>
                                <option value="Concluída">Concluída</option>
                            </select>
                        </div>
                    </div>
                    
                    <div class="mt-3" style="background: #f8f9fa; padding: 15px; border-radius: 8px;">
                        <h4 style="font-size: 1rem; margin-bottom: 10px;">🔍 Histórico de Alterações (Auditoria)</h4>
                        <div id="auditLogList" style="max-height: 150px; overflow-y: auto; font-size: 0.85rem;">
                            <small class="text-secondary">Selecione uma ficha para ver logs...</small>
                        </div>
                    </div>

                    <div class="mt-3 text-right" style="display:flex; gap:10px; justify-content:flex-end;">
                        <button type="submit" class="btn btn-primary" style="flex:1">Salvar Alterações</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    // Local functions to load data
    async function loadUsers() {
        const tbody = document.getElementById('usersTableBody');
        tbody.innerHTML = '<tr><td colspan="5">Carregando...</td></tr>';
        try {
            const snap = await getDocs(collection(db, "users"));
            tbody.innerHTML = '';
            snap.forEach(d => {
                const u = d.data();
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td style="padding: 10px;">${u.name}</td>
                    <td style="padding: 10px;">${u.username || u.email}</td>
                    <td style="padding: 10px;">${formatRole(u.role)}</td>
                    <td style="padding: 10px;"><span style="color: ${u.active ? 'green' : 'red'}">${u.active ? 'Ativo' : 'Inativo'}</span></td>
                    <td style="padding: 10px;">
                        <button class="btn btn-sm btn-outline-danger" onclick="toggleUser('${d.id}', ${u.active})">
                            ${u.active ? 'Bloquear' : 'Desbloquear'}
                        </button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        } catch (e) { tbody.innerHTML = `<tr><td colspan="5">Erro: ${e.message}</td></tr>`; }
    }

    async function loadFichas() {
        const tbody = document.getElementById('allFichasTableBody');
        tbody.innerHTML = '<tr><td colspan="6">Carregando...</td></tr>';
        try {
            const snap = await getDocs(collection(db, "fichas"));
            tbody.innerHTML = '';
            snap.forEach(d => {
                const f = d.data();
                const date = f.createdAt ? new Date(f.createdAt.seconds * 1000).toLocaleDateString() : 'N/A';
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td style="padding: 10px;">${f.citizenName}</td>
                    <td style="padding: 10px;">${f.citizenCPF}</td>
                    <td style="padding: 10px;">${formatSector(f.targetSector)}</td>
                    <td style="padding: 10px;">${date}</td>
                    <td style="padding: 10px;"><span class="badge ${f.status === 'Aberta' ? 'bg-warning' : 'bg-success'}">${f.status}</span></td>
                    <td style="padding: 10px;">
                        <button class="btn btn-sm btn-primary" onclick="openEditFicha('${d.id}')">Editar / Logs</button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        } catch (e) { tbody.innerHTML = `<tr><td colspan="6">Erro: ${e.message}</td></tr>`; }
    }

    // Init
    loadUsers();
    loadFichas();

    // Event listeners for Modals
    document.getElementById('btnNewUser').onclick = () => document.getElementById('userModal').style.display = 'block';
    document.getElementById('btnCancelUserModal').onclick = () => document.getElementById('userModal').style.display = 'none';
    document.getElementById('btnCloseEditModal').onclick = () => document.getElementById('editFichaModal').style.display = 'none';

    // New User Logic (Secondary App)
    document.getElementById('newUserForm').onsubmit = async (e) => {
        e.preventDefault();
        const name = document.getElementById('newUserName').value;
        const login = document.getElementById('newUserLogin').value;
        const pass = document.getElementById('newUserPass').value;
        const role = document.getElementById('newUserRole').value;

        try {
            const success = await CreateUserSecondaryApp(login, pass, { name, role, active: true, sector: formatRole(role) });
            if (success) {
                alert("Usuário criado!");
                document.getElementById('userModal').style.display = 'none';
                loadUsers();
            }
        } catch (err) { alert("Erro: " + err.message); }
    };

    // Edit Ficha Logic
    document.getElementById('editFichaForm').onsubmit = async (e) => {
        e.preventDefault();
        const fid = document.getElementById('editFichaId').value;
        const newName = document.getElementById('editCitizenName').value;
        const newCPF = document.getElementById('editCitizenCPF').value;
        const newNh = document.getElementById('editNeighborhood').value;
        const newSt = document.getElementById('editStreet').value;
        const newSec = document.getElementById('editTargetSector').value;
        const newSta = document.getElementById('editStatus').value;

        try {
            const fref = doc(db, "fichas", fid);
            const old = (await getDoc(fref)).data();
            const changes = [];
            if (old.citizenName !== newName) changes.push({ field: "Nome", oldVal: old.citizenName, newVal: newName });
            if (old.citizenCPF !== newCPF) changes.push({ field: "CPF", oldVal: old.citizenCPF, newVal: newCPF });
            if (old.address?.neighborhood !== newNh) changes.push({ field: "Bairro", oldVal: old.address?.neighborhood, newVal: newNh });
            if (old.address?.street !== newSt) changes.push({ field: "Rua", oldVal: old.address?.street, newVal: newSt });
            if (old.targetSector !== newSec) changes.push({ field: "Setor", oldVal: old.targetSector, newVal: newSec });
            if (old.status !== newSta) changes.push({ field: "Status", oldVal: old.status, newVal: newSta });

            if (changes.length > 0) {
                await updateDoc(fref, { citizenName: newName, citizenCPF: newCPF, address: { neighborhood: newNh, street: newSt }, targetSector: newSec, status: newSta });
                await AuditService.logChanges(fid, adminUser.name || adminUser.email, changes);
                alert("Alterações salvas e auditadas!");
            } else { alert("Nenhuma mudança detectada."); }
            document.getElementById('editFichaModal').style.display = 'none';
            loadFichas();
        } catch (err) { alert("Erro: " + err.message); }
    };

    // Global Hacks for Buttons inside Table
    window.toggleUser = async (uid, status) => {
        if (!confirm("Alterar status do usuário?")) return;
        await updateDoc(doc(db, "users", uid), { active: !status });
        loadUsers();
    };

    window.openEditFicha = async (fid) => {
        const snap = await getDoc(doc(db, "fichas", fid));
        if (!snap.exists()) return;
        const f = snap.data();

        document.getElementById('editFichaId').value = fid;
        document.getElementById('editCitizenName').value = f.citizenName;
        document.getElementById('editCitizenCPF').value = f.citizenCPF;
        document.getElementById('editNeighborhood').value = f.address?.neighborhood || '';
        document.getElementById('editStreet').value = f.address?.street || '';
        document.getElementById('editTargetSector').value = f.targetSector;
        document.getElementById('editStatus').value = f.status;

        document.getElementById('editFichaModal').style.display = 'block';

        // Load Audit Logs
        const logList = document.getElementById('auditLogList');
        logList.innerHTML = '<small>Carregando histórico...</small>';
        try {
            const auditSnap = await getDocs(query(collection(db, "fichas", fid, "audit_logs"), orderBy("timestamp", "desc")));
            if (auditSnap.empty) { logList.innerHTML = '<small>Nenhuma alteração registrada ainda.</small>'; return; }
            logList.innerHTML = '';
            auditSnap.forEach(lDoc => {
                const l = lDoc.data();
                const lDate = l.timestamp ? new Date(l.timestamp.seconds * 1000).toLocaleString() : 'N/A';
                logList.innerHTML += `
                    <div style="margin-bottom: 5px; border-bottom: 1px solid #ddd; padding-bottom: 5px;">
                        <strong>${lDate} - ${l.user}</strong><br>
                        Campo: <em>${l.field}</em>: <span style="color:red">${l.oldValue}</span> ➔ <span style="color:green">${l.newValue}</span>
                    </div>
                `;
            });
        } catch (e) { logList.innerHTML = '<small>Erro ao carregar auditoria.</small>'; }
    };
}

// User Creation Helper (Secondary App Instance)
async function CreateUserSecondaryApp(username, password, userData) {
    const config = {
        apiKey: "AIzaSyD3tsO5FLdvu5_LmCT7U1kW-2qhTfMRzRg",
        authDomain: "social-assist-sistema.firebaseapp.com",
        projectId: "social-assist-sistema",
        storageBucket: "social-assist-sistema.firebasestorage.app",
        messagingSenderId: "88500554526",
        appId: "1:88500554526:web:1c2c3278f1a03d659cd70f"
    };
    const secondaryApp = initializeApp(config, "SecondaryApp_" + Date.now());
    const secondaryAuth = getAuth2(secondaryApp);
    let email = username.includes('@') ? username : username + "@sistema.local";
    try {
        const cred = await createUser2(secondaryAuth, email, password);
        await UserService.createUserProfile(cred.user.uid, { ...userData, email, username });
        return true;
    } catch (e) { throw e; }
}

function formatRole(role) {
    const map = { 'admin': 'Chefe/Admin', 'recepcao': 'Recepção', 'bolsa_familia': 'Bolsa Família', 'crianca_feliz': 'Criança Feliz', 'psicologia': 'Psicologia' };
    return map[role] || role;
}

function formatSector(s) {
    const map = { 'bolsa_familia': 'Bolsa Família', 'crianca_feliz': 'Criança Feliz', 'psicologia': 'Psicologia' };
    return map[s] || s;
}
