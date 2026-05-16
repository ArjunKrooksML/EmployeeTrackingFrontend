import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer';
import type { SalaryResult } from '../lib/api';
import { COMPANY } from '../lib/company';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const fmt = (n: number) => 'Rs. ' + n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const s = StyleSheet.create({
  page: { padding: 36, fontSize: 9, color: '#111', fontFamily: 'Helvetica' },

  // Header
  header: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 2, borderBottomColor: '#1e3a8a', paddingBottom: 12, marginBottom: 14 },
  logo: { width: 50, height: 50, marginRight: 14 },
  coName: { fontSize: 14, fontFamily: 'Helvetica-Bold', color: '#1e3a8a', marginBottom: 3 },
  coDetail: { fontSize: 8, color: '#555', marginBottom: 1 },

  // Title
  slipTitle: { textAlign: 'center', fontSize: 12, fontFamily: 'Helvetica-Bold', color: '#1e3a8a', letterSpacing: 1.5, marginBottom: 3 },
  slipMonth: { textAlign: 'center', fontSize: 9, color: '#666', marginBottom: 16 },

  // Employee info box
  infoBox: { flexDirection: 'row', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 3, marginBottom: 14 },
  infoSection: { flex: 1, padding: 8 },
  infoSectionBorder: { flex: 1, padding: 8, borderLeftWidth: 1, borderLeftColor: '#e5e7eb' },
  infoRow: { flexDirection: 'row', marginBottom: 5 },
  infoLabel: { fontFamily: 'Helvetica-Bold', color: '#555', width: 76, fontSize: 8.5 },
  infoVal: { color: '#111', flex: 1, fontSize: 8.5 },

  // Side-by-side tables
  tableRow: { flexDirection: 'row', marginBottom: 12 },
  table: { flex: 1, borderWidth: 1, borderColor: '#d1d5db' },
  tableLeft: { flex: 1, borderWidth: 1, borderColor: '#d1d5db', marginRight: 8 },
  tHead: { flexDirection: 'row', backgroundColor: '#dbeafe', padding: 6 },
  tHeadLabel: { fontFamily: 'Helvetica-Bold', color: '#1e40af', fontSize: 8.5, flex: 2 },
  tHeadAmt: { fontFamily: 'Helvetica-Bold', color: '#1e40af', fontSize: 8.5, textAlign: 'right' },
  tRow: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#e5e7eb', padding: 6 },
  tRowTotal: { flexDirection: 'row', borderTopWidth: 1.5, borderTopColor: '#6b7280', padding: 6, backgroundColor: '#f9fafb' },
  tLabel: { flex: 2, fontSize: 8.5, color: '#333' },
  tAmt: { textAlign: 'right', fontSize: 8.5, color: '#333' },
  tLabelBold: { flex: 2, fontSize: 8.5, fontFamily: 'Helvetica-Bold' },
  tAmtBold: { textAlign: 'right', fontSize: 8.5, fontFamily: 'Helvetica-Bold' },

  // Net salary bar
  netBar: { flexDirection: 'row', backgroundColor: '#1e3a8a', borderRadius: 4, padding: 10, marginBottom: 14, alignItems: 'center' },
  netLabel: { flex: 1, color: '#ffffff', fontFamily: 'Helvetica-Bold', fontSize: 11 },
  netAmt: { color: '#fbbf24', fontFamily: 'Helvetica-Bold', fontSize: 13 },

  // Attendance summary
  attBox: { flexDirection: 'row', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 3, padding: 10, marginBottom: 24, justifyContent: 'space-around' },
  attItem: { alignItems: 'center' },
  attNum: { fontFamily: 'Helvetica-Bold', fontSize: 13, color: '#1e3a8a' },
  attNumWarn: { fontFamily: 'Helvetica-Bold', fontSize: 13, color: '#f59e0b' },
  attNumBad: { fontFamily: 'Helvetica-Bold', fontSize: 13, color: '#ef4444' },
  attNumGood: { fontFamily: 'Helvetica-Bold', fontSize: 13, color: '#10b981' },
  attLbl: { color: '#777', fontSize: 7.5, marginTop: 2 },

  // Footer
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', borderTopWidth: 1, borderTopColor: '#d1d5db', paddingTop: 14 },
  stampBox: { width: 80, height: 80, borderWidth: 1, borderColor: '#e5e7eb', borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
  stampPlaceholder: { fontSize: 8, color: '#bbb' },
  stamp: { width: 80, height: 80, opacity: 0.85 },
  sigBox: { alignItems: 'flex-end' },
  sigLine: { width: 130, borderTopWidth: 1, borderTopColor: '#555', marginBottom: 5, marginTop: 32 },
  sigText: { fontSize: 8, color: '#555', fontFamily: 'Helvetica-Bold' },
  note: { fontSize: 7.5, color: '#aaa', textAlign: 'center', marginTop: 12 },
});

interface Props {
  result: SalaryResult;
  advance: number;
}

export default function PayslipPDF({ result, advance }: Props) {
  const totalDed = parseFloat((result.leave_deduction + advance).toFixed(2));
  const net = parseFloat((result.gross_salary - totalDed).toFixed(2));
  const monthName = MONTHS[result.month - 1] ?? '';
  const base = typeof window !== 'undefined' ? window.location.origin : '';

  const earnings: [string, number][] = [
    ['Basic', result.basic],
    ['DA (Dearness Allowance)', result.da],
    ['HRA (House Rent Allowance)', result.hra],
    ['Others', result.others],
  ];

  const deductions: [string, number][] = [
    ['Leave Deduction', result.leave_deduction],
    ['Advance Deduction', advance],
  ];

  return (
    <Document>
      <Page size="A4" style={s.page}>

        {/* Company Header */}
        <View style={s.header}>
          <Image src={base + COMPANY.logo} style={s.logo} />
          <View>
            <Text style={s.coName}>{COMPANY.name}</Text>
            <Text style={s.coDetail}>{COMPANY.address}</Text>
            <Text style={s.coDetail}>Phone: {COMPANY.phone}</Text>
            <Text style={s.coDetail}>GST: {COMPANY.gst}</Text>
          </View>
        </View>

        {/* Slip Title */}
        <Text style={s.slipTitle}>SALARY SLIP</Text>
        <Text style={s.slipMonth}>{monthName} {result.year}</Text>

        {/* Employee Info */}
        <View style={s.infoBox}>
          <View style={s.infoSection}>
            <View style={s.infoRow}>
              <Text style={s.infoLabel}>Employee Name</Text>
              <Text style={s.infoVal}>{result.employee_name}</Text>
            </View>
            <View style={s.infoRow}>
              <Text style={s.infoLabel}>Employee ID</Text>
              <Text style={s.infoVal}>#{result.employee_id}</Text>
            </View>
          </View>
          <View style={s.infoSectionBorder}>
            <View style={s.infoRow}>
              <Text style={s.infoLabel}>Pay Period</Text>
              <Text style={s.infoVal}>{monthName} {result.year}</Text>
            </View>
            <View style={s.infoRow}>
              <Text style={s.infoLabel}>Working Days</Text>
              <Text style={s.infoVal}>{result.working_days}</Text>
            </View>
          </View>
        </View>

        {/* Earnings & Deductions */}
        <View style={s.tableRow}>
          {/* Earnings */}
          <View style={s.tableLeft}>
            <View style={s.tHead}>
              <Text style={s.tHeadLabel}>Earnings</Text>
              <Text style={s.tHeadAmt}>Amount</Text>
            </View>
            {earnings.map(([label, val]) => (
              <View key={label} style={s.tRow}>
                <Text style={s.tLabel}>{label}</Text>
                <Text style={s.tAmt}>{fmt(val)}</Text>
              </View>
            ))}
            <View style={s.tRowTotal}>
              <Text style={s.tLabelBold}>Gross Salary</Text>
              <Text style={s.tAmtBold}>{fmt(result.gross_salary)}</Text>
            </View>
          </View>

          {/* Deductions */}
          <View style={s.table}>
            <View style={s.tHead}>
              <Text style={s.tHeadLabel}>Deductions</Text>
              <Text style={s.tHeadAmt}>Amount</Text>
            </View>
            {deductions.map(([label, val]) => (
              <View key={label} style={s.tRow}>
                <Text style={s.tLabel}>{label}</Text>
                <Text style={s.tAmt}>{fmt(val)}</Text>
              </View>
            ))}
            <View style={s.tRowTotal}>
              <Text style={s.tLabelBold}>Total Deductions</Text>
              <Text style={s.tAmtBold}>{fmt(totalDed)}</Text>
            </View>
          </View>
        </View>

        {/* Net Salary */}
        <View style={s.netBar}>
          <Text style={s.netLabel}>Net Salary (Take Home)</Text>
          <Text style={s.netAmt}>{fmt(net)}</Text>
        </View>

        {/* Attendance Summary */}
        <View style={s.attBox}>
          <View style={s.attItem}>
            <Text style={s.attNum}>{result.working_days}</Text>
            <Text style={s.attLbl}>Working Days</Text>
          </View>
          <View style={s.attItem}>
            <Text style={s.attNumWarn}>{result.lates_count}</Text>
            <Text style={s.attLbl}>Lates</Text>
          </View>
          <View style={s.attItem}>
            <Text style={s.attNumBad}>{result.full_absents}</Text>
            <Text style={s.attLbl}>Full Absents</Text>
          </View>
          <View style={s.attItem}>
            <Text style={s.attNumWarn}>{result.half_day_absents}</Text>
            <Text style={s.attLbl}>Half Days</Text>
          </View>
          <View style={s.attItem}>
            <Text style={result.paid_leave_used ? s.attNumGood : s.attNum}>
              {result.paid_leave_used ? '1' : '0'}
            </Text>
            <Text style={s.attLbl}>Free Leave Used</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={s.footer}>
          <Image src={base + COMPANY.stamp} style={s.stamp} />
          <View style={s.sigBox}>
            <View style={s.sigLine} />
            <Text style={s.sigText}>Authorised Signatory</Text>
          </View>
        </View>

        <Text style={s.note}>This is a computer-generated payslip and does not require a physical signature.</Text>
      </Page>
    </Document>
  );
}
