import { db } from '../firebase-config.js';
import { collection, getDocs, doc, updateDoc, setDoc, getDoc, query, orderBy, where, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { AuditService } from '../services/audit-service.js';
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { UserService } from '../services/user-service.js';
import { getAuth as getAuth2, createUserWithEmailAndPassword as createUser2 } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

export async function render(container, adminUser) {
    let unsubs = [];
    let charts = {};
    let globalFichas = [];

    container.innerHTML = `
        <div class="fade-in">
            <div class="d-flex justify-content-between align-items-center mb-4" style="display:flex; justify-content:space-between; align-items:center;">
                <h2 style="margin:0;"><i class="bi bi-speedometer2 me-2" style="color:var(--primary);"></i> Dashboard Resolutivo</h2>
                <div class="badge bg-primary">Monitoramento em Tempo Real</div>
            </div>

            <!-- Stats Charts Row -->
            <div class="row mb-4" style="display: flex; gap: 1.5rem; flex-wrap: wrap;">
                <div class="card" style="flex: 1; min-width: 300px; padding: 1.5rem;">
                    <h4 style="font-size: 0.9rem; margin-bottom: 1rem;"><i class="bi bi-pie-chart me-2"></i> Demandas por Setor</h4>
                    <canvas id="chartSectors" height="200"></canvas>
                </div>
                <div class="card" style="flex: 1.5; min-width: 400px; padding: 1.5rem;">
                    <h4 style="font-size: 0.9rem; margin-bottom: 1rem;"><i class="bi bi-graph-up me-2"></i> Fluxo de Atendimento (Hoje)</h4>
                    <canvas id="chartFlow" height="200"></canvas>
                </div>
            </div>
            
            <!-- User Management -->
            <div class="card mb-4">
                <div class="d-flex justify-content-between align-items-center mb-4" style="display: flex; justify-content: space-between; align-items: center;">
                    <h3 style="margin:0; font-size: 1.25rem;"><i class="bi bi-people-fill me-2"></i> Usuários do Sistema</h3>
                    <button id="btnNewUser" class="btn btn-primary btn-sm"><i class="bi bi-plus-lg"></i> Novo Usuário</button>
                </div>
                <div class="table-responsive">
                    <table class="table">
                        <thead>
                            <tr>
                                <th>Nome</th>
                                <th>Login</th>
                                <th>Função</th>
                                <th>Status</th>
                                <th>Ações</th>
                            </tr>
                        </thead>
                        <tbody id="usersTableBody">
                            <tr><td colspan="5" class="text-center text-secondary">Carregando usuários...</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- Ficha Management Header -->
            <div class="d-flex justify-content-between align-items-center mt-5 mb-3" style="display:flex; justify-content:space-between; align-items:center;">
                <h2 style="margin:0; font-size: 1.5rem;"><i class="bi bi-card-list me-2"></i> Visão Geral - Atendimentos</h2>
                <span id="fichaCounter" class="badge bg-primary" style="font-size: 0.9rem; padding: 0.5rem 1rem;"></span>
            </div>

            <div class="card">
                <!-- Filters -->
                <div class="row mb-4" style="display: flex; gap: 1rem; flex-wrap: wrap; background: var(--bg-main); padding: 1.25rem; border-radius: var(--round-md); border: 1px solid var(--border-color);">
                    <div style="flex: 2; min-width: 250px;">
                        <label class="form-label">Buscar Ficha</label>
                        <div style="position:relative;">
                            <i class="bi bi-search" style="position:absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--text-secondary);"></i>
                            <input type="text" id="filterSearch" class="form-control" placeholder="Nome, CPF ou Assunto..." style="padding-left: 35px;">
                        </div>
                    </div>
                    <div style="flex: 1; min-width: 150px;">
                        <label class="form-label">Status</label>
                        <select id="filterStatus" class="form-control">
                            <option value="">Todos os Status</option>
                            <option value="Aberta">Aberta</option>
                            <option value="Concluída">Concluída</option>
                        </select>
                    </div>
                    <div style="flex: 1; min-width: 150px;">
                        <label class="form-label">Setor</label>
                        <select id="filterSector" class="form-control">
                            <option value="">Todos os Setores</option>
                            <option value="bolsa_familia">Bolsa Família</option>
                            <option value="crianca_feliz">Criança Feliz</option>
                            <option value="psicologia">Psicologia</option>
                            <option value="assistencia_social">Assistência Social</option>
                            <option value="loas">LOAS</option>
                            <option value="anexo_cras">Anexo do CRAS</option>
                        </select>
                    </div>
                    <div style="flex: 1; min-width: 150px;">
                        <label class="form-label">Data</label>
                        <input type="date" id="filterDate" class="form-control">
                    </div>
                </div>

                <div class="table-responsive">
                    <table class="table">
                        <thead>
                            <tr>
                                <th>Cidadão</th>
                                <th>CPF</th>
                                <th>Setor Atual</th>
                                <th>Data Criação</th>
                                <th>Status</th>
                                <th>Ações</th>
                            </tr>
                        </thead>
                        <tbody id="allFichasTableBody">
                            <tr><td colspan="6" class="text-center text-secondary">Carregando fichas...</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        <!-- Add User Modal -->
        <div id="userModal" style="display:none; position: fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.6); backdrop-filter: blur(4px); z-index: 1001;">
            <div class="card" style="width: 450px; margin: 60px auto; padding: 2.5rem; border: none; box-shadow: var(--shadow-lg);">
                <h3 class="mb-4"><i class="bi bi-person-plus me-2"></i> Novo Usuário</h3>
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
                            <option value="assistencia_social">Assistência Social</option>
                            <option value="loas">LOAS</option>
                            <option value="anexo_cras">Anexo do CRAS</option>
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

        <!-- Edit Ficha Modal (Side-by-Side) -->
        <div id="editFichaModal" style="display:none; position: fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.6); backdrop-filter: blur(4px); overflow-y: auto; z-index: 1000;">
            <div class="card" style="width: 95%; max-width: 1100px; margin: 30px auto; padding: 2.5rem; border: none; box-shadow: var(--shadow-lg);">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 1.5rem;">
                    <h3 style="margin:0;"><i class="bi bi-pencil-fill me-2" style="color:var(--primary);"></i> Detalhes & Auditoria</h3>
                    <button type="button" id="btnCloseEditModal" class="btn btn-sm btn-outline-secondary" style="border:none; font-size:1.5rem; padding:0;">&times;</button>
                </div>
                
                <div class="row" style="display:flex; gap: 2rem;">
                    <!-- Left Column: Form -->
                    <div style="flex: 1; border-right: 1px solid var(--border-color); padding-right: 2rem;">
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
                            <div class="row">
                                <div class="col-6 form-group">
                                    <label>Bairro</label>
                                    <input type="text" id="editNeighborhood" class="form-control" required>
                                </div>
                                <div class="col-6 form-group">
                                    <label>Rua/Endereço</label>
                                    <input type="text" id="editStreet" class="form-control" required>
                                </div>
                            </div>
                            <div class="row">
                                <div class="col-6 form-group">
                                    <label>Setor Atual</label>
                                    <select id="editTargetSector" class="form-control" required>
                                        <option value="bolsa_familia">Bolsa Família</option>
                                        <option value="crianca_feliz">Criança Feliz</option>
                                        <option value="psicologia">Psicologia</option>
                                        <option value="assistencia_social">Assistência Social</option>
                                        <option value="loas">LOAS</option>
                                        <option value="anexo_cras">Anexo do CRAS</option>
                                    </select>
                                </div>
                                <div class="col-6 form-group">
                                    <label>Status</label>
                                    <select id="editStatus" class="form-control" required>
                                        <option value="Aberta">Aberta</option>
                                        <option value="Concluída">Concluída</option>
                                    </select>
                                </div>
                            </div>

                            <div class="form-group">
                                <label>Assunto / Solicitação (Histórico)</label>
                                <textarea id="editSubject" class="form-control" rows="3" required placeholder="Aguardando alterações para salvar automaticamente..."></textarea>
                                <small class="text-info" id="saveIndicator" style="display:none;">☁️ Salvando...</small>
                            </div>
                            
                            <div class="mt-3 text-right">
                                <button type="submit" class="btn btn-primary w-100">Salvar Dados Cadastrais</button>
                            </div>
                        </form>
                    </div>

                    <!-- Right Column: Unified History -->
                    <div class="col-md-6">
                        <h4 style="font-size: 1.1rem; margin-bottom: 15px;">🔍 Histórico Unificado (Alterações e Atendimentos)</h4>
                        <div id="auditLogList" style="max-height: 450px; overflow-y: auto; font-size: 0.85rem; padding-right: 5px;">
                            <small class="text-secondary">Selecione uma ficha para ver logs...</small>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Real-time Listeners
    const unsubUsers = onSnapshot(collection(db, "users"), (snap) => {
        const tbody = document.getElementById('usersTableBody');
        if (!tbody) return;
        tbody.innerHTML = '';
        snap.forEach(d => {
            const u = d.data();
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${u.name}</strong></td>
                <td><code style="font-size:0.85rem;">${u.username || u.email}</code></td>
                <td>${formatRole(u.role)}</td>
                <td>
                    <span class="badge ${u.active ? 'bg-success' : 'bg-danger'}" style="${!u.active ? 'background: #fee2e2; color: #b91c1c;' : ''}">
                        ${u.active ? 'Ativo' : 'Bloqueado'}
                    </span>
                </td>
                <td>
                    <button class="btn btn-sm ${u.active ? 'btn-outline-danger' : 'btn-primary'}" onclick="toggleUser('${d.id}', ${u.active})">
                        <i class="bi bi-${u.active ? 'lock' : 'unlock'}"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    });
    unsubs.push(unsubUsers);

    const unsubFichas = onSnapshot(collection(db, "fichas"), (snap) => {
        globalFichas = [];
        snap.forEach(d => globalFichas.push({ id: d.id, ...d.data() }));
        initCharts(globalFichas);
        applyFilters();
    });
    unsubs.push(unsubFichas);

    function initCharts(fichas) {
        const ctxSectors = document.getElementById('chartSectors');
        const ctxFlow = document.getElementById('chartFlow');
        if (!ctxSectors || !ctxFlow) return;

        const sectorData = {};
        fichas.forEach(f => {
            const s = formatSector(f.targetSector);
            sectorData[s] = (sectorData[s] || 0) + 1;
        });

        if (charts.sectors) charts.sectors.destroy();
        charts.sectors = new Chart(ctxSectors, {
            type: 'doughnut',
            data: {
                labels: Object.keys(sectorData),
                datasets: [{
                    data: Object.values(sectorData),
                    backgroundColor: ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'],
                    borderWidth: 0
                }]
            },
            options: { plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 10 } } } } }
        });

        const flowData = new Array(24).fill(0);
        const today = new Date().toLocaleDateString();
        fichas.forEach(f => {
            if (f.createdAt) {
                const date = new Date(f.createdAt.seconds * 1000);
                if (date.toLocaleDateString() === today) {
                    flowData[date.getHours()]++;
                }
            }
        });

        if (charts.flow) charts.flow.destroy();
        charts.flow = new Chart(ctxFlow, {
            type: 'line',
            data: {
                labels: Array.from({ length: 24 }, (_, i) => `${i}h`),
                datasets: [{
                    label: 'Novas Fichas',
                    data: flowData,
                    borderColor: '#2563eb',
                    backgroundColor: 'rgba(37, 99, 235, 0.1)',
                    fill: true,
                    tension: 0.4
                }]
            },
            options: { scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }, plugins: { legend: { display: false } } }
        });
    }

    function applyFilters() {
        const search = document.getElementById('filterSearch')?.value.toLowerCase() || "";
        const status = document.getElementById('filterStatus')?.value || "";
        const sector = document.getElementById('filterSector')?.value || "";
        const date = document.getElementById('filterDate')?.value || "";

        const filtered = globalFichas.filter(f => {
            const matchesSearch = f.citizenName?.toLowerCase().includes(search) || f.citizenCPF?.includes(search) || f.subject?.toLowerCase().includes(search);
            const matchesStatus = !status || f.status === status;
            const matchesSector = !sector || f.targetSector === sector;
            const matchesDate = !date || (f.createdAt && new Date(f.createdAt.seconds * 1000).toISOString().split('T')[0] === date);
            return matchesSearch && matchesStatus && matchesSector && matchesDate;
        });

        displayFichas(filtered);
    }

    function displayFichas(fichas) {
        const tbody = document.getElementById('allFichasTableBody');
        const counter = document.getElementById('fichaCounter');
        if (!tbody) return;
        tbody.innerHTML = '';

        fichas.sort((a, b) => {
            if (a.status !== b.status) return a.status === 'Aberta' ? -1 : 1;
            return (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);
        });

        fichas.forEach(f => {
            const dateObj = f.createdAt ? new Date(f.createdAt.seconds * 1000) : null;
            const dateStr = dateObj ? dateObj.toLocaleString() : 'N/A';
            let priorityClass = "";
            let priorityIcon = "";
            let waitTimeStr = "";

            if (f.status === 'Aberta' && dateObj) {
                const now = new Date();
                const diffHours = (now - dateObj) / (1000 * 60 * 60);
                if (diffHours > 2) {
                    priorityClass = "priority-alert";
                    priorityIcon = '<i class="bi bi-exclamation-triangle-fill text-danger pulse-icon me-1"></i>';
                } else if (diffHours > 1) {
                    priorityClass = "priority-warning";
                    priorityIcon = '<i class="bi bi-clock-history text-warning me-1"></i>';
                }
                const diffMin = Math.floor((now - dateObj) / (1000 * 60));
                waitTimeStr = `<br><small class="text-secondary">Espera: ${diffMin} min</small>`;
            }

            const tr = document.createElement('tr');
            if (priorityClass) tr.className = priorityClass;
            tr.innerHTML = `
                <td>${priorityIcon}<strong>${f.citizenName}</strong>${waitTimeStr}</td>
                <td class="text-secondary">${f.citizenCPF}</td>
                <td><span class="badge bg-primary" style="background:var(--primary-light); color:var(--primary);">${formatSector(f.targetSector)}</span></td>
                <td>${dateStr}</td>
                <td><span class="badge ${f.status === 'Aberta' ? 'bg-warning' : 'bg-success'}">${f.status}</span></td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="openEditFicha('${f.id}')">
                        <i class="bi bi-pencil-square"></i> Detalhes
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });
        counter.textContent = `Total: ${fichas.length}`;
    }

    // Filter Listeners
    ['filterSearch', 'filterStatus', 'filterSector', 'filterDate'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', applyFilters);
    });

    // Modals
    document.getElementById('btnNewUser').onclick = () => document.getElementById('userModal').style.display = 'block';
    document.getElementById('btnCancelUserModal').onclick = () => document.getElementById('userModal').style.display = 'none';
    document.getElementById('btnCloseEditModal').onclick = () => document.getElementById('editFichaModal').style.display = 'none';

    // New User
    document.getElementById('newUserForm').onsubmit = async (e) => {
        e.preventDefault();
        const name = document.getElementById('newUserName').value;
        const login = document.getElementById('newUserLogin').value;
        const pass = document.getElementById('newUserPass').value;
        const role = document.getElementById('newUserRole').value;
        try {
            await CreateUserSecondaryApp(login, pass, { name, role, active: true, sector: formatRole(role) });
            alert("Usuário criado!");
            document.getElementById('userModal').style.display = 'none';
        } catch (err) { alert("Erro: " + err.message); }
    };

    // Edit Ficha
    document.getElementById('editFichaForm').onsubmit = async (e) => {
        e.preventDefault();
        const fid = document.getElementById('editFichaId').value;
        const newName = document.getElementById('editCitizenName').value;
        const newCPF = document.getElementById('editCitizenCPF').value;
        const newNh = document.getElementById('editNeighborhood').value;
        const newSt = document.getElementById('editStreet').value;
        const newSec = document.getElementById('editTargetSector').value;
        const newSta = document.getElementById('editStatus').value;
        const newSub = document.getElementById('editSubject').value;
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
            if (old.subject !== newSub) changes.push({ field: "Assunto", oldVal: old.subject, newVal: newSub });

            if (changes.length > 0) {
                await updateDoc(fref, { citizenName: newName, citizenCPF: newCPF, address: { neighborhood: newNh, street: newSt }, targetSector: newSec, status: newSta, subject: newSub });
                await AuditService.logChanges(fid, adminUser.name || adminUser.email, changes, newSub);
                alert("Alterações salvas!");
            }
            document.getElementById('editFichaModal').style.display = 'none';
        } catch (err) { alert("Erro: " + err.message); }
    };

    // Global Hacks
    window.toggleUser = async (uid, status) => {
        if (!confirm("Alterar status do usuário?")) return;
        await updateDoc(doc(db, "users", uid), { active: !status });
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
        document.getElementById('editSubject').value = f.subject || '';
        document.getElementById('editFichaModal').style.display = 'block';

        let lastSubject = f.subject || '';
        document.getElementById('editSubject').onblur = async (e) => {
            const newSub = e.target.value;
            if (newSub === lastSubject) return;
            const indicator = document.getElementById('saveIndicator');
            indicator.style.display = 'inline';
            try {
                await updateDoc(doc(db, "fichas", fid), { subject: newSub });
                await AuditService.logChanges(fid, adminUser.name || adminUser.email, [{ field: "Assunto", oldVal: lastSubject, newVal: newSub }], newSub);
                lastSubject = newSub;
            } catch (err) { console.error(err); }
            setTimeout(() => indicator.style.display = 'none', 1000);
        };

        const logList = document.getElementById('auditLogList');
        logList.innerHTML = '<small>Carregando histórico...</small>';
        try {
            const auditSnap = await getDocs(query(collection(db, "audit_history"), where("fichaId", "==", fid)));
            const procSnap = await getDocs(collection(db, "fichas", fid, "procedures"));
            const allLogs = [];
            auditSnap.forEach(d => allLogs.push({ ...d.data(), type: 'audit' }));
            procSnap.forEach(d => allLogs.push({ ...d.data(), type: 'procedure' }));
            allLogs.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
            if (allLogs.length === 0) { logList.innerHTML = '<small>Nenhum log encontrado.</small>'; return; }
            logList.innerHTML = '';
            allLogs.forEach(l => {
                const lDate = l.timestamp ? new Date(l.timestamp.seconds * 1000).toLocaleString() : 'N/A';
                if (l.type === 'audit') {
                    logList.innerHTML += `<div style="margin-bottom:8px; border-bottom:1px solid #eee; padding:8px; background:#fff; border-radius:4px;"><strong>${lDate} - 👤 ${l.user}</strong><br><span>${l.field}: <span style="color:red">${l.oldValue}</span> ➔ <span style="color:green">${l.newValue}</span></span></div>`;
                } else {
                    logList.innerHTML += `<div style="margin-bottom:8px; border-bottom:1px solid #eee; padding:8px; background:#f0f7ff; border-radius:4px; border-left:4px solid #0d6efd;"><strong>${lDate} - 🩺 ${l.createdBy}</strong><br><small class="badge bg-primary">${l.type}</small><br><span>"${l.description}"</span></div>`;
                }
            });
        } catch (e) { logList.innerHTML = '<small>Erro ao carregar logs.</small>'; }
    };

    function formatRole(role) {
        const map = { 'admin': 'Chefe/Admin', 'recepcao': 'Recepção', 'bolsa_familia': 'Bolsa Família', 'crianca_feliz': 'Criança Feliz', 'psicologia': 'Psicologia', 'assistencia_social': 'Assistência Social', 'loas': 'LOAS', 'anexo_cras': 'Anexo do CRAS' };
        return map[role] || role;
    }

    function formatSector(s) {
        const map = { 'bolsa_familia': 'Bolsa Família', 'crianca_feliz': 'Criança Feliz', 'psicologia': 'Psicologia', 'assistencia_social': 'Assistência Social', 'loas': 'LOAS', 'anexo_cras': 'Anexo do CRAS' };
        return map[s] || s;
    }

    async function CreateUserSecondaryApp(username, password, userData) {
        const config = { apiKey: "AIzaSyD3tsO5FLdvu5_LmCT7U1kW-2qhTfMRzRg", authDomain: "social-assist-sistema.firebaseapp.com", projectId: "social-assist-sistema", storageBucket: "social-assist-sistema.firebasestorage.app", messagingSenderId: "88500554526", appId: "1:88500554526:web:1c2c3278f1a03d659cd70f" };
        const secondaryApp = initializeApp(config, "SecondaryApp_" + Date.now());
        const secondaryAuth = getAuth2(secondaryApp);
        let email = username.includes('@') ? username : username + "@sistema.local";
        const cred = await createUser2(secondaryAuth, email, password);
        await UserService.createUserProfile(cred.user.uid, { ...userData, email, username });
        return true;
    }
}
