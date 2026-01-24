/**
 * Service to handle Detailed PDF Report Generation
 */
export const ReportService = {
    async generatePDF(fichas, periodLabel, dateRange) {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        const { start, end } = dateRange;

        // Filter fichas by date range
        const filteredFichas = fichas.filter(f => {
            if (!f.createdAt) return false;
            const date = new Date(f.createdAt.seconds * 1000);
            return date >= start && date <= end;
        });

        // --- Statistics & Grouping ---
        const total = filteredFichas.length;
        const completed = filteredFichas.filter(f => f.status === 'Concluída').length;
        const open = total - completed;

        const sectorStats = {};
        filteredFichas.forEach(f => {
            const s = this.formatSector(f.targetSector);
            sectorStats[s] = (sectorStats[s] || 0) + 1;
        });

        // --- PDF Header & Branding ---
        doc.setFontSize(22);
        doc.setTextColor(30, 64, 175); // Deeper blue
        doc.text("S.A.S. - Sistema de Gestão", 105, 20, { align: "center" });

        doc.setFontSize(14);
        doc.setTextColor(100, 116, 139);
        doc.text("Secretaria de Assistência Social - Relatório Executivo", 105, 28, { align: "center" });
        doc.setLineWidth(0.5);
        doc.line(20, 32, 190, 32);

        // --- Report Context ---
        doc.setFontSize(10);
        doc.setTextColor(51, 65, 85);
        doc.setFont(undefined, 'bold');
        doc.text(`TIPO DE RELATÓRIO:`, 20, 42);
        doc.setFont(undefined, 'normal');
        doc.text(periodLabel.toUpperCase(), 60, 42);

        doc.setFont(undefined, 'bold');
        doc.text(`PERÍODO:`, 20, 48);
        doc.setFont(undefined, 'normal');
        doc.text(`${start.toLocaleDateString()} a ${end.toLocaleDateString()}`, 60, 48);

        doc.setFont(undefined, 'bold');
        doc.text(`EMISSÃO:`, 130, 42);
        doc.setFont(undefined, 'normal');
        doc.text(new Date().toLocaleString(), 155, 42);

        // --- Summary Section ---
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(30, 64, 175);
        doc.text("1. RESUMO OPERACIONAL", 20, 62);

        // Stats boxes
        doc.autoTable({
            startY: 65,
            head: [['Indicador', 'Quantidade', 'Percentual']],
            body: [
                ['Total de Atendimentos', total, '100%'],
                ['Fichas Concluídas', completed, `${total > 0 ? ((completed / total) * 100).toFixed(1) : 0}%`],
                ['Aguardando Atendimento', open, `${total > 0 ? ((open / total) * 100).toFixed(1) : 0}%`]
            ],
            theme: 'grid',
            headStyles: { fillColor: [71, 85, 105] },
            styles: { fontSize: 9, cellPadding: 2 }
        });

        // --- Sector Breakdown ---
        doc.text("2. VOLUME POR SETORES", 20, doc.lastAutoTable.finalY + 15);
        const sectorRows = Object.entries(sectorStats)
            .sort((a, b) => b[1] - a[1])
            .map(([name, count]) => [name, count, `${((count / total) * 100).toFixed(1)}%`]);

        doc.autoTable({
            startY: doc.lastAutoTable.finalY + 18,
            head: [['Setor de Destino', 'Qtd. Fichas', 'Participação']],
            body: sectorRows,
            theme: 'striped',
            headStyles: { fillColor: [30, 64, 175] },
            styles: { fontSize: 9 }
        });

        // --- Detailed List (New Page if needed) ---
        doc.addPage();
        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.text("3. LISTAGEM DETALHADA DE ATENDIMENTOS", 20, 20);

        const tableData = filteredFichas.map(f => [
            f.citizenName,
            f.citizenCPF,
            this.formatSector(f.targetSector),
            f.subject || 'N/A',
            f.status,
            f.createdAt ? new Date(f.createdAt.seconds * 1000).toLocaleDateString() : 'N/A'
        ]);

        doc.autoTable({
            startY: 25,
            head: [['Cidadão', 'CPF', 'Setor', 'Assunto/Demanda', 'Status', 'Data']],
            body: tableData,
            headStyles: { fillColor: [30, 64, 175], fontSize: 9 },
            styles: { fontSize: 8, cellPadding: 2 },
            columnStyles: {
                3: { cellWidth: 50 } // Giving more space to Subject
            }
        });

        // --- Footer (Pagination) ---
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(148, 163, 184);
            doc.text(`Página ${i} de ${pageCount} - Gerado para Secretaria de Assistência Social`, 105, 285, { align: "center" });
        }

        doc.save(`Relatorio_Detallhado_SAS_${periodLabel}.pdf`);
    },

    formatSector(s) {
        const map = { 'bolsa_familia': 'Bolsa Família', 'crianca_feliz': 'Criança Feliz', 'psicologia': 'Psicologia', 'assistencia_social': 'Assistência Social', 'loas': 'LOAS', 'anexo_cras': 'Anexo do CRAS' };
        return map[s] || s;
    }
};
