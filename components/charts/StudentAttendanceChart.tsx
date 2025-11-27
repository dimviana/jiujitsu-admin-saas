import React, { useContext, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import Card from '../ui/Card';
import { AppContext } from '../../context/AppContext';

const StudentAttendanceChart: React.FC<{ studentId: string }> = ({ studentId }) => {
    const { attendanceRecords } = useContext(AppContext);

    const data = useMemo(() => {
        const today = new Date();
        const last6Months = [];

        // Generate last 6 months keys
        for (let i = 5; i >= 0; i--) {
            const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
            last6Months.push({
                dateObj: d,
                name: d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''),
                key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` // YYYY-MM format
            });
        }

        // Filter records for this student
        const studentRecords = attendanceRecords.filter(r => r.studentId === studentId && r.status === 'present');

        // Map counts
        return last6Months.map(month => {
            const count = studentRecords.filter(r => r.date.startsWith(month.key)).length;
            return {
                name: month.name,
                classes: count
            };
        });
    }, [attendanceRecords, studentId]);
  
    return (
      <Card className="h-full">
         <h3 className="text-lg font-semibold text-slate-800 mb-4">Frequência Mensal (Presenças)</h3>
         <div className="h-64">
           <ResponsiveContainer width="100%" height="100%">
             <BarChart data={data}>
               <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
               <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8'}} />
               <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8'}} allowDecimals={false} />
               <Tooltip 
                 contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #f1f5f9' }} 
                 cursor={{fill: '#f1f5f9'}}
               />
               <Bar dataKey="classes" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Presenças" />
             </BarChart>
           </ResponsiveContainer>
         </div>
      </Card>
    );
};

export default StudentAttendanceChart;