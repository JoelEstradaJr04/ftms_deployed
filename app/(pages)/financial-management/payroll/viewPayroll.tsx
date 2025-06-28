'use client';
import React from 'react';
import '../../../styles/viewPayroll.css';

// Add types for processed_benefits, processed_deductions, and hr_data_snapshot
interface BenefitItem {
  benefitType: { name: string };
  value: string | number;
  frequency: string;
  prorated: number;
}
interface DeductionItem {
  deductionType: { name: string };
  value: string | number;
  frequency: string;
  prorated: number;
}
interface AttendanceItem {
  date: string;
  status: string;
}
interface HrDataSnapshot {
  attendances?: AttendanceItem[];
  // ...other fields as needed
}

type PayrollRecord = {
  payroll_id: string;
  employee_number: string;
  employee_name: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  suffix?: string;
  employee_status: string;
  hire_date: string;
  termination_date?: string | null;
  job_title: string;
  department: string;
  payroll_period: "Monthly" | "Weekly";
  payroll_start_date: string;
  payroll_end_date: string;
  basic_rate: number;
  days_worked: number;
  
  // Earnings
  basic_pay: number;
  overtime_regular: number;
  overtime_holiday: number;
  service_incentive_leave: number;
  holiday_pay: number;
  thirteenth_month_pay: number;
  
  // Benefits
  revenue_benefit: number;
  safety_benefit: number;
  additional_benefits: number;
  
  // Deductions
  sss_deduction: number;
  philhealth_deduction: number;
  pag_ibig_deduction: number;
  cash_advance: number;
  damage_shortage: number;
  other_deductions: number;
  
  // Totals
  gross_total_earnings: number;
  total_deductions: number;
  net_pay: number;
  
  // Status
  status: "Released" | "Pending" | string;
  date_released?: string | null;
  created_by?: string;
  calculation_notes?: string;
  processed_benefits?: BenefitItem[];
  processed_deductions?: DeductionItem[];
  hr_data_snapshot?: HrDataSnapshot;
};

type ViewPayrollModalProps = {
  record: PayrollRecord;
  onClose: () => void;
};

const ViewPayrollModal: React.FC<ViewPayrollModalProps> = ({ record, onClose }) => {
  const [showHrSnapshot, setShowHrSnapshot] = React.useState(false);
  return (
    <div className="modalOverlay">
      <div className="viewPayrollModal">
        <div className="modalHeader">
          <h2>View Payroll Details</h2>
          <button className="closeButton" onClick={onClose}>&times;</button>
        </div>
        <div className="modalBody">
          <div className="mainDetails">
            <div className="detailRow">
              <span className="label">Employee Number:</span> 
              <span className="value">{record.employee_number}</span>
            </div>
            <div className="detailRow">
              <span className="label">Employee Name:</span> 
              <span className="value">{record.employee_name}</span>
            </div>
            <div className="detailRow">
              <span className="label">Job Title:</span> 
              <span className="value">{record.job_title}</span>
            </div>
            <div className="detailRow">
              <span className="label">Department:</span> 
              <span className="value">{record.department}</span>
            </div>
            <div className="detailRow">
              <span className="label">Employee Status:</span> 
              <span className="value">{record.employee_status}</span>
            </div>
            <div className="detailRow">
              <span className="label">Payroll Period:</span> 
              <span className="value">{record.payroll_period}</span>
            </div>
            <div className="detailRow">
              <span className="label">Period:</span> 
              <span className="value">
                {new Date(record.payroll_start_date).toLocaleDateString()} - {new Date(record.payroll_end_date).toLocaleDateString()}
              </span>
            </div>
            <div className="detailRow">
              <span className="label">Hire Date:</span> 
              <span className="value">{new Date(record.hire_date).toLocaleDateString()}</span>
            </div>
            <div className="detailRow">
              <span className="label">Status:</span> 
              <span className="value">{record.status}</span>
            </div>
            <div className="detailRow">
              <span className="label">Date Released:</span>
              <span className="value">
                {record.date_released ? new Date(record.date_released).toLocaleDateString() : "—"}
              </span>
            </div>
          </div>

          {/* Attendance Breakdown */}
          <div style={{ marginTop: 16 }}>
            <h3>Attendance Breakdown</h3>
            {record.hr_data_snapshot?.attendances && record.hr_data_snapshot.attendances.length > 0 ? (
              <table className="attendanceTable">
                <thead>
                  <tr><th>Date</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {record.hr_data_snapshot.attendances.map((att: AttendanceItem, idx: number) => (
                    <tr key={idx}>
                      <td>{new Date(att.date).toLocaleDateString()}</td>
                      <td>{att.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : <div>No attendance records.</div>}
          </div>

          {/* Benefit Breakdown */}
          <div style={{ marginTop: 16 }}>
            <h3>Benefit Itemization</h3>
            {record.processed_benefits && record.processed_benefits.length > 0 ? (
              <table className="benefitTable">
                <thead>
                  <tr><th>Name</th><th>Value</th><th>Frequency</th><th>Prorated</th></tr>
                </thead>
                <tbody>
                  {record.processed_benefits.map((b: BenefitItem, idx: number) => (
                    <tr key={idx}>
                      <td>{b.benefitType?.name || '-'}</td>
                      <td>₱{Number(b.value).toLocaleString()}</td>
                      <td>{b.frequency}</td>
                      <td>₱{Number(b.prorated).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : <div>No benefits.</div>}
          </div>

          {/* Deduction Breakdown */}
          <div style={{ marginTop: 16 }}>
            <h3>Deduction Itemization</h3>
            {record.processed_deductions && record.processed_deductions.length > 0 ? (
              <table className="deductionTable">
                <thead>
                  <tr><th>Name</th><th>Value</th><th>Frequency</th><th>Prorated</th></tr>
                </thead>
                <tbody>
                  {record.processed_deductions.map((d: DeductionItem, idx: number) => (
                    <tr key={idx}>
                      <td>{d.deductionType?.name || '-'}</td>
                      <td>₱{Number(d.value).toLocaleString()}</td>
                      <td>{d.frequency}</td>
                      <td>₱{Number(d.prorated).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : <div>No deductions.</div>}
          </div>

          {/* Proration/Calculation Notes */}
          <div style={{ marginTop: 16 }}>
            <h3>Calculation Notes</h3>
            <div style={{ background: '#f8f9fa', padding: 8, borderRadius: 4 }}>{record.calculation_notes || '—'}</div>
          </div>

          {/* Metadata */}
          <div style={{ marginTop: 16 }}>
            <h3>Metadata</h3>
            <div>Created By: {record.created_by}</div>
            <div>Date Released: {record.date_released ? new Date(record.date_released).toLocaleDateString() : '—'}</div>
            <div>Status: {record.status}</div>
          </div>

          {/* HR Data Snapshot (collapsible) */}
          <div style={{ marginTop: 16 }}>
            <button onClick={() => setShowHrSnapshot(s => !s)} style={{ marginBottom: 4 }}>
              {showHrSnapshot ? 'Hide' : 'Show'} Raw HR Data Snapshot
            </button>
            {showHrSnapshot && (
              <pre style={{ maxHeight: 200, overflow: 'auto', background: '#f4f4f4', padding: 8, borderRadius: 4 }}>
                {JSON.stringify(record.hr_data_snapshot, null, 2)}
              </pre>
            )}
          </div>

          <div>
            <table className="grossEarningsTable">
              <thead>
                <tr>
                  <th colSpan={2}>Gross Earnings</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Employee Number</td>
                  <td>{record.employee_number}</td>
                </tr>
                <tr>
                  <td>Days Worked</td>
                  <td>{record.days_worked}</td>
                </tr>
                <tr>
                  <td>Basic Rate</td>
                  <td>₱{record.basic_rate.toLocaleString()}</td>
                </tr>
                <tr>
                  <td>Basic Pay</td>
                  <td>₱{record.basic_pay.toLocaleString()}</td>
                </tr>

                <tr>
                  <td colSpan={2} style={{ fontWeight: "bold", background: "#f8f9fa" }}>Overtime</td>
                </tr>
                <tr>
                  <td>Regular Overtime</td>
                  <td>₱{record.overtime_regular.toLocaleString()}</td>
                </tr>
                <tr>
                  <td>Holiday Overtime</td>
                  <td>₱{record.overtime_holiday.toLocaleString()}</td>
                </tr>

                <tr>
                  <td colSpan={2} style={{ fontWeight: "bold", background: "#f8f9fa" }}>Wage Related Benefits</td>
                </tr>
                <tr>
                  <td>Service Incentive Leave Pay</td>
                  <td>₱{record.service_incentive_leave.toLocaleString()}</td>
                </tr>
                <tr>
                  <td>Holiday Pay</td>
                  <td>₱{record.holiday_pay.toLocaleString()}</td>
                </tr>
                <tr>
                  <td>13th Month Pay</td>
                  <td>₱{record.thirteenth_month_pay.toLocaleString()}</td>
                </tr>

                <tr>
                  <td colSpan={2} style={{ fontWeight: "bold", background: "#f8f9fa" }}>Performance Related Benefits</td>
                </tr>
                <tr>
                  <td>Revenue Benefit</td>
                  <td>₱{record.revenue_benefit.toLocaleString()}</td>
                </tr>
                <tr>
                  <td>Safety Benefit</td>
                  <td>₱{record.safety_benefit.toLocaleString()}</td>
                </tr>
                <tr>
                  <td>Additional Benefits</td>
                  <td>₱{record.additional_benefits.toLocaleString()}</td>
                </tr>

                <tr style={{ fontWeight: "bold", background: "#e9ecef" }}>
                  <td>GROSS TOTAL EARNINGS:</td>
                  <td>₱{record.gross_total_earnings.toLocaleString()}</td>
                </tr>
              </tbody>
            </table>

            <table className="deductionTable">
              <thead>
                <tr>
                  <th colSpan={2}>Deductions</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="deductionLabel">SSS:</td>
                  <td className="deductionValue">₱{record.sss_deduction.toLocaleString()}</td>
                </tr>
                <tr>
                  <td className="deductionLabel">PhilHealth:</td>
                  <td className="deductionValue">₱{record.philhealth_deduction.toLocaleString()}</td>
                </tr>
                <tr>
                  <td className="deductionLabel">Pag-IBIG:</td>
                  <td className="deductionValue">₱{record.pag_ibig_deduction.toLocaleString()}</td>
                </tr>
                <tr>
                  <td className="deductionLabel">Cash Advance:</td>
                  <td className="deductionValue">₱{record.cash_advance.toLocaleString()}</td>
                </tr>
                <tr>
                  <td className="deductionLabel">Damage/Shortage:</td>
                  <td className="deductionValue">₱{record.damage_shortage.toLocaleString()}</td>
                </tr>
                <tr>
                  <td className="deductionLabel">Other Deductions:</td>
                  <td className="deductionValue">₱{record.other_deductions.toLocaleString()}</td>
                </tr>
                <tr style={{ fontWeight: "bold", background: "#e9ecef" }}>
                  <td className="deductionLabel">TOTAL DEDUCTIONS:</td>
                  <td className="deductionValue">₱{record.total_deductions.toLocaleString()}</td>
                </tr>
              </tbody>
            </table>

            <table className="bonusTable" style={{ marginTop: "1.5rem" }}>
              <thead>
                <tr>
                  <th colSpan={2}>Net Pay Summary</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="bonusLabel"><strong>Gross Total Earnings:</strong></td>
                  <td className="bonusValue"><strong>₱{record.gross_total_earnings.toLocaleString()}</strong></td>
                </tr>
                <tr>
                  <td className="bonusLabel"><strong>Total Deductions:</strong></td>
                  <td className="bonusValue"><strong>₱{record.total_deductions.toLocaleString()}</strong></td>
                </tr>
                <tr style={{ fontWeight: "bold", background: "#d4edda", fontSize: "1.1em" }}>
                  <td className="bonusLabel">NET PAY:</td>
                  <td className="bonusValue">₱{record.net_pay.toLocaleString()}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        
        <div className="modalFooter">
          <button className="closeBtn" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
};

export default ViewPayrollModal;