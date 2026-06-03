import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer';
import type { Project, PurchaseOrder, SupplyOrder } from '../lib/api';
import { COMPANY } from '../lib/company';

const fmt = (d: string) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

const s = StyleSheet.create({
  page: { padding: 36, fontSize: 9, color: '#111', fontFamily: 'Helvetica' },

  header: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 2, borderBottomColor: '#1e3a8a', paddingBottom: 12, marginBottom: 12 },
  logo: { width: 50, height: 50, marginRight: 14 },
  coName: { fontSize: 14, fontFamily: 'Helvetica-Bold', color: '#1e3a8a', marginBottom: 3 },
  coDetail: { fontSize: 8, color: '#555', marginBottom: 1 },

  docTitle: { textAlign: 'center', fontSize: 13, fontFamily: 'Helvetica-Bold', color: '#1e3a8a', letterSpacing: 1.5, marginBottom: 12 },

  infoBox: { flexDirection: 'row', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 3, marginBottom: 12 },
  infoSection: { flex: 1, padding: 8 },
  infoSectionR: { flex: 1, padding: 8, borderLeftWidth: 1, borderLeftColor: '#e5e7eb' },
  infoRow: { flexDirection: 'row', marginBottom: 5 },
  infoLabel: { fontFamily: 'Helvetica-Bold', color: '#555', width: 82, fontSize: 8.5 },
  infoVal: { color: '#111', flex: 1, fontSize: 8.5 },

  sectionHead: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#1e40af', backgroundColor: '#dbeafe', padding: 6, marginBottom: 6 },

  // Overview table
  table: { borderWidth: 1, borderColor: '#d1d5db', marginBottom: 14 },
  tHead: { flexDirection: 'row', backgroundColor: '#dbeafe', padding: 5 },
  tRow: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#e5e7eb', padding: 5 },
  tRowAlt: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#e5e7eb', padding: 5, backgroundColor: '#f9fafb' },
  tRowTotal: { flexDirection: 'row', borderTopWidth: 1.5, borderTopColor: '#6b7280', padding: 5, backgroundColor: '#f3f4f6' },
  c0: { width: 60, fontSize: 8.5 },
  c1: { flex: 1, fontSize: 8.5, textAlign: 'right' },
  c0h: { width: 60, fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#1e40af' },
  c1h: { flex: 1, fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#1e40af', textAlign: 'right' },
  c0b: { width: 60, fontSize: 8.5, fontFamily: 'Helvetica-Bold' },
  c1b: { flex: 1, fontSize: 8.5, fontFamily: 'Helvetica-Bold', textAlign: 'right' },

  // PO block
  poBlock: { marginBottom: 12, borderWidth: 1, borderColor: '#bfdbfe', borderRadius: 2 },
  poHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#eff6ff', padding: 7, borderBottomWidth: 1, borderBottomColor: '#bfdbfe' },
  poNum: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#1e3a8a' },
  poDate: { fontSize: 8, color: '#555' },
  poBody: { padding: 8 },
  poTableHead: { flexDirection: 'row', backgroundColor: '#dbeafe', padding: 4 },
  poTableRow: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#e5e7eb', padding: 4 },

  // SO block (nested)
  soLabel: { fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#6d28d9', marginTop: 8, marginBottom: 4 },
  soBlock: { marginBottom: 6, borderWidth: 1, borderColor: '#ede9fe', borderRadius: 2 },
  soHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f5f3ff', padding: '4 7', borderBottomWidth: 1, borderBottomColor: '#ede9fe' },
  soNum: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#6d28d9' },
  soInvoice: { fontSize: 8, color: '#92400e', fontFamily: 'Helvetica-Bold' },
  soDate: { fontSize: 8, color: '#555' },
  soBody: { padding: 5 },
  soTableHead: { flexDirection: 'row', backgroundColor: '#f5f3ff', padding: 4 },
  soTableRow: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#ede9fe', padding: 4 },

  colSize: { width: 50, fontSize: 8 },
  colQty: { flex: 1, fontSize: 8, textAlign: 'right' },
  colSizeH: { width: 50, fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#1e40af' },
  colQtyH: { flex: 1, fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#1e40af', textAlign: 'right' },
  colSizeHS: { width: 50, fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#6d28d9' },
  colQtyHS: { flex: 1, fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#6d28d9', textAlign: 'right' },

  noSOs: { fontSize: 8, color: '#999', fontStyle: 'italic', marginTop: 6 },

  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', borderTopWidth: 1, borderTopColor: '#d1d5db', paddingTop: 12, marginTop: 16 },
  footerLeft: {},
  footerCoName: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#1e3a8a', marginBottom: 2 },
  footerDetail: { fontSize: 7.5, color: '#666', marginBottom: 1 },
  stamp: { width: 70, height: 70, opacity: 0.85 },
  sigBox: { alignItems: 'flex-end' },
  sigLine: { width: 130, borderTopWidth: 1, borderTopColor: '#555', marginBottom: 4, marginTop: 24 },
  sigText: { fontSize: 8, color: '#555', fontFamily: 'Helvetica-Bold' },
  genNote: { fontSize: 7, color: '#aaa', textAlign: 'center', marginTop: 8 },
});

interface Props {
  project: Project;
  pos: PurchaseOrder[];
  sos: SupplyOrder[];
}

export default function ProjectSummaryPDF({ project, pos, sos }: Props) {
  const base = typeof window !== 'undefined' ? window.location.origin : '';
  const sosByPO = new Map<number, SupplyOrder[]>();
  sos.forEach(so => { const arr = sosByPO.get(so.po_id) ?? []; arr.push(so); sosByPO.set(so.po_id, arr); });

  const allSizes = [...new Set([
    ...pos.flatMap(po => po.items.map(i => i.size)),
    ...sos.flatMap(so => so.items.map(i => i.size)),
  ])].sort();

  const overview = allSizes.map(size => {
    const poQty = pos.reduce((sum, po) => sum + (po.items.find(i => i.size === size)?.quantity ?? 0), 0);
    const supplied = sos.reduce((sum, so) => sum + (so.items.find(i => i.size === size)?.supplied_qty ?? 0), 0);
    return { size, poQty, supplied, balance: poQty - supplied };
  });

  const totalOrdered = overview.reduce((s, r) => s + r.poQty, 0);
  const totalSupplied = overview.reduce((s, r) => s + r.supplied, 0);
  const totalBalance = overview.reduce((s, r) => s + r.balance, 0);

  return (
    <Document>
      <Page size="A4" style={s.page}>

        {/* Company header */}
        <View style={s.header}>
          <Image src={base + COMPANY.logo} style={s.logo} />
          <View>
            <Text style={s.coName}>{COMPANY.name}</Text>
            <Text style={s.coDetail}>{COMPANY.address}</Text>
            <Text style={s.coDetail}>Phone: {COMPANY.phone}  ·  GST: {COMPANY.gst}</Text>
          </View>
        </View>

        <Text style={s.docTitle}>PROJECT ORDER SUMMARY</Text>

        {/* Project + client info */}
        <View style={s.infoBox}>
          <View style={s.infoSection}>
            <View style={s.infoRow}>
              <Text style={s.infoLabel}>Project</Text>
              <Text style={s.infoVal}>{project.name}</Text>
            </View>
            <View style={s.infoRow}>
              <Text style={s.infoLabel}>Client</Text>
              <Text style={s.infoVal}>{project.client_name || '—'}</Text>
            </View>
            <View style={s.infoRow}>
              <Text style={s.infoLabel}>Address</Text>
              <Text style={s.infoVal}>{project.address || '—'}</Text>
            </View>
          </View>
          <View style={s.infoSectionR}>
            <View style={s.infoRow}>
              <Text style={s.infoLabel}>Start Date</Text>
              <Text style={s.infoVal}>{project.start_date ? fmt(project.start_date) : '—'}</Text>
            </View>
            <View style={s.infoRow}>
              <Text style={s.infoLabel}>Completion</Text>
              <Text style={s.infoVal}>{project.completion_date ? fmt(project.completion_date) : 'Ongoing'}</Text>
            </View>
            <View style={s.infoRow}>
              <Text style={s.infoLabel}>Total POs</Text>
              <Text style={s.infoVal}>{pos.length}</Text>
            </View>
            <View style={s.infoRow}>
              <Text style={s.infoLabel}>Total SOs</Text>
              <Text style={s.infoVal}>{sos.length}</Text>
            </View>
          </View>
        </View>

        {/* Overview */}
        <Text style={s.sectionHead}>QUANTITY OVERVIEW</Text>
        <View style={s.table}>
          <View style={s.tHead}>
            <Text style={s.c0h}>Size</Text>
            <Text style={s.c1h}>Ordered</Text>
            <Text style={s.c1h}>Supplied</Text>
            <Text style={s.c1h}>Balance</Text>
          </View>
          {overview.map((row, i) => (
            <View key={row.size} style={i % 2 === 0 ? s.tRow : s.tRowAlt}>
              <Text style={s.c0}>{row.size}</Text>
              <Text style={s.c1}>{row.poQty}</Text>
              <Text style={s.c1}>{row.supplied}</Text>
              <Text style={[s.c1, { color: row.balance === 0 ? '#059669' : '#111' }]}>{row.balance}</Text>
            </View>
          ))}
          <View style={s.tRowTotal}>
            <Text style={s.c0b}>Total</Text>
            <Text style={s.c1b}>{totalOrdered}</Text>
            <Text style={s.c1b}>{totalSupplied}</Text>
            <Text style={s.c1b}>{totalBalance}</Text>
          </View>
        </View>

        {/* Per-PO sections */}
        <Text style={s.sectionHead}>PURCHASE ORDERS & SUPPLY DETAILS</Text>
        {pos.map(po => {
          const poSOs = sosByPO.get(po.id) ?? [];
          return (
            <View key={po.id} style={s.poBlock}>
              <View style={s.poHeader}>
                <Text style={s.poNum}>{po.po_number}</Text>
                <Text style={s.poDate}>{fmt(po.created_at)}</Text>
              </View>
              <View style={s.poBody}>
                {/* PO items */}
                <View style={s.table}>
                  <View style={s.poTableHead}>
                    <Text style={s.colSizeH}>Size</Text>
                    <Text style={s.colQtyH}>Ordered Qty</Text>
                  </View>
                  {po.items.map(item => (
                    <View key={item.id} style={s.poTableRow}>
                      <Text style={s.colSize}>{item.size}</Text>
                      <Text style={s.colQty}>{item.quantity}</Text>
                    </View>
                  ))}
                </View>

                {/* SOs under this PO */}
                {poSOs.length === 0 ? (
                  <Text style={s.noSOs}>No supply orders raised against this PO.</Text>
                ) : (
                  <>
                    <Text style={s.soLabel}>Supply Orders ({poSOs.length})</Text>
                    {poSOs.map(so => (
                      <View key={so.id} style={s.soBlock}>
                        <View style={s.soHeader}>
                          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                            <Text style={s.soNum}>SO-{so.id}</Text>
                            {so.invoice_number && (
                              <Text style={s.soInvoice}>  {so.invoice_number}</Text>
                            )}
                          </View>
                          <Text style={s.soDate}>{fmt(so.created_at)}</Text>
                        </View>
                        <View style={s.soBody}>
                          <View style={s.table}>
                            <View style={s.soTableHead}>
                              <Text style={s.colSizeHS}>Size</Text>
                              <Text style={s.colQtyHS}>Supplied</Text>
                              <Text style={s.colQtyHS}>Balance</Text>
                            </View>
                            {so.items.map(item => (
                              <View key={item.id} style={s.soTableRow}>
                                <Text style={s.colSize}>{item.size}</Text>
                                <Text style={s.colQty}>{item.supplied_qty}</Text>
                                <Text style={[s.colQty, { color: item.balance_qty === 0 ? '#059669' : '#111' }]}>{item.balance_qty}</Text>
                              </View>
                            ))}
                          </View>
                        </View>
                      </View>
                    ))}
                  </>
                )}
              </View>
            </View>
          );
        })}

        {/* Footer */}
        <View style={s.footer}>
          <View style={s.footerLeft}>
            <Text style={s.footerCoName}>{COMPANY.name}</Text>
            <Text style={s.footerDetail}>{COMPANY.address}</Text>
            <Text style={s.footerDetail}>Phone: {COMPANY.phone}  ·  GST: {COMPANY.gst}</Text>
          </View>
          <Image src={base + COMPANY.stamp} style={s.stamp} />
          <View style={s.sigBox}>
            <View style={s.sigLine} />
            <Text style={s.sigText}>Authorised Signatory</Text>
          </View>
        </View>

        <Text style={s.genNote}>
          Generated on {fmt(new Date().toISOString())}  ·  This is a system-generated document.
        </Text>
      </Page>
    </Document>
  );
}
