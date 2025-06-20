'use client';
import React from 'react';
import '../../../styles/viewPayroll.css';


type PayrollRecord = {
  payroll_id: string;
  employee_name: string;
  job_title: string;
  department: string;
  payroll_period: "Monthly" | "Weekly";
  net_pay: number;
  deduction: number;
  salary: number;
  status: "Released" | "Pending" | string;
  date_released?: string | null;
};

type ViewPayrollModalProps = {
  record: PayrollRecord;
  onClose: () => void;
};

const ViewPayrollModal: React.FC<ViewPayrollModalProps> = ({ record, onClose }) => (
  <div className="modalOverlay">
    <div className="viewPayrollModal">
      <div className="modalHeader">
        <h2>View Payroll</h2>
        <button className="closeButton" onClick={onClose}>&times;</button>
      </div>
      <div className="modalBody">
        <div className="mainDetails">
            <div className="detailRow"><span className="label">Employee Name:</span> <span className="value">{record.employee_name}</span></div>
            <div className="detailRow"><span className="label">Job Title:</span> <span className="value">{record.job_title}</span></div>
            <div className="detailRow"><span className="label">Department:</span> <span className="value">{record.department}</span></div>
            <div className="detailRow"><span className="label">Payroll Period:</span> <span className="value">{record.payroll_period}</span></div>
            <div className="detailRow"><span className="label">Salary:</span> <span className="value">₱{record.salary.toLocaleString()}</span></div>
            <div className="detailRow"><span className="label">Deduction:</span> <span className="value">₱{record.deduction.toLocaleString()}</span></div>
            <div className="detailRow"><span className="label">Net Pay:</span> <span className="value">₱{record.net_pay.toLocaleString()}</span></div>
            <div className="detailRow"><span className="label">Status:</span> <span className="value">{record.status}</span></div>
            <div className="detailRow">
                <span className="label">Date Released:</span>
                <span className="value">
                    {record.date_released ? new Date(record.date_released).toLocaleDateString() : "—"}
                </span>
            </div>
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
                            <td>POS</td>
                            <td>C</td>
                        </tr>
                        <tr>
                            <td>Days of Work</td>
                            <td>3</td>
                        </tr>
                        <tr>
                            <td>Basic Rate</td>
                            <td>550</td>
                        </tr>
                        <tr>
                            <td>Basic Pay</td>
                            <td>1,650</td>
                        </tr>

                        <tr>
                            <td colSpan={2} style={{ fontWeight: "bold", background: "#f8f9fa" }}>Overtime</td>
                        </tr>
                        <tr>
                            <td>Regular Days</td>
                            <td>343.72</td>
                        </tr>
                        <tr>
                            <td>Holidays</td>
                            <td>-</td>
                        </tr>
        
                        <tr>
                            <td colSpan={2} style={{ fontWeight: "bold", background: "#f8f9fa" }}>Wage Related Benefits</td>
                        </tr>
                        <tr>
                            <td>Service Incentive Leave Pay</td>
                            <td>12.44</td>
                        </tr>
                        <tr>
                            <td>Holiday Pay</td>
                            <td>29.86</td>
                        </tr>
                        <tr>
                            <td>13th Month Pay</td>
                            <td>45.83</td>
                        </tr>

                        <tr>
                            <td colSpan={2} style={{ fontWeight: "bold", background: "#f8f9fa" }}>Performance Related Benefits</td>
                        </tr>
                        <tr>
                            <td>Revenue</td>
                            <td>600</td>
                        </tr>
                        <tr>
                            <td>Safety</td>
                            <td>600</td>
                        </tr>
                        <tr>
                            <td>Additional</td>
                            <td>-</td>
                        </tr>

                        <tr>
                            <td>GROSS TOTAL EARNINGS:</td>
                            <td>₱2,000.00</td>
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
                            <td className="deductionValue">₱0.00</td>
                        </tr>
                        <tr>
                            <td className="deductionLabel">PhilHealth:</td>
                            <td className="deductionValue">₱0.00</td>
                        </tr>
                        <tr>
                            <td className="deductionLabel">Pag-IBIG:</td>
                            <td className="deductionValue">₱0.00</td>
                        </tr>
                        <tr>
                            <td className="deductionLabel">Cash Advance:</td>
                            <td className="deductionValue">₱0.00</td>
                        </tr>
                        <tr>
                            <td className="deductionLabel">Damage/Short:</td>
                            <td className="deductionValue">₱0.00</td>
                        </tr>
                        <tr>
                            <td className="deductionLabel"><strong>Total Deduction:</strong></td>
                            <td className="deductionValue"><strong>₱0.00</strong></td>
                        </tr>
                    </tbody>
                </table>

                <table className="bonusTable" style={{ marginTop: "1.5rem" }}>
                    <thead>
                        <tr>
                            <th colSpan={2}>Net Pay</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td className="bonusLabel"><strong>Total Gross Earnings:</strong></td>
                            <td className="bonusValue"><strong>₱0.00</strong></td>
                        </tr>
                        <tr>
                            <td className="bonusLabel"><strong>Total Deduction:</strong></td>
                            <td className="bonusValue"><strong>₱0.00</strong></td>
                        </tr>
                        <tr>
                            <td className="bonusLabel"><strong>Net Pay:</strong></td>
                            <td className="bonusValue"><strong>₱0.00</strong></td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
        {/* CLOSE BUTTON */}
        <div className="modalFooter">
            <button className="closeBtn" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
);

export default ViewPayrollModal;