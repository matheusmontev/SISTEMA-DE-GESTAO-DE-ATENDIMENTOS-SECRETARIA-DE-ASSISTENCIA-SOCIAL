/**
 * Service to handle PDF Report Generation
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

        // Statistics
        const total = filteredFichas.length;
        const completed = filteredFichas.filter(f => f.status === 'Concluída').length;
        const open = total - completed;

        // --- PDF Header ---
        doc.setFontSize(22);
        doc.setTextColor(37, 99, 235); // Primary color
        doc.text("S.A.S. - Sistema de Gestão", 105, 20, { align: "center" });

        doc.setFontSize(14);
        doc.setTextColor(100, 116, 139); // Gray
        doc.text("Secretaria de Assistência Social", 105, 30, { align: "center" });

        doc.line(20, 35, 190, 35); // Horizontal line

        // Report Info
        doc.setFontSize(12);
        doc.setTextColor(30, 41, 59);
        doc.text(`Relatório: ${periodLabel}`, 20, 45);
        doc.text(`Período: ${start.toLocaleDateString()} a ${end.toLocaleDateString()}`, 20, 52);
        doc.text(`Data de Emissão: ${new Date().toLocaleString()}`, 20, 59);

        // Stats Box
        doc.setFillColor(248, 250, 252);
        doc.rect(20, 65, 170, 25, 'F');
        doc.setFont(undefined, 'bold');
        doc.text(`Total de Atendimentos: ${total}`, 30, 75);
        doc.setFont(undefined, 'normal');
        doc.text(`Concluídos: ${completed}  |  Em Aberto: ${open}`, 30, 82);

        // --- Table ---
        const tableData = filteredFichas.map(f => [
            f.citizenName,
            f.citizenCPF,
            this.formatSector(f.targetSector),
            f.createdAt ? new Date(f.createdAt.seconds * 1000).toLocaleDateString() : 'N/A',
            f.status
        ]);

        doc.autoTable({
            startY: 95,
            head: [['Cidadão', 'CPF', 'Setor', 'Data', 'Status']],
            body: tableData,
            headStyles: { fillColor: [37, 99, 235], fontSize: 10 },
            styles: { fontSize: 9 },
            alternateRowStyles: { fillColor: [241, 245, 249] }
        });

        // --- Footer ---
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(148, 163, 184);
            doc.text(`Página ${i} de ${pageCount} - Gerado automaticamente pelo sistema S.A.S.`, 105, 285, { align: "center" });
        }

        doc.save(`Relatorio_SAS_${periodLabel.replace(' ', '_')}.pdf`);
    },

    formatSector(s) {
        const map = { 'bolsa_familia': 'Bolsa Família', 'crianca_feliz': 'Criança Feliz', 'psicologia': 'Psicologia', 'assistencia_social': 'Assistência Social', 'loas': 'LOAS', 'anexo_cras': 'Anexo do CRAS' };
        return map[s] || s;
    }
};
