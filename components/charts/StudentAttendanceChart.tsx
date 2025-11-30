
import React, { useContext, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
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
        const studentRecords = attendanceRecords.filter(r => r.studentId === studentId);

        // Map counts
        return last6Months.map(month => {
            const monthRecords = studentRecords.filter(r => r.date.startsWith(month.key));
            return {
                name: month.name,
                presencas: monthRecords.filter(r => r.status === 'present').length,
                faltas: monthRecords.filter(r => r.status === 'absent').length
            };
        });
    }, [attendanceRecords, studentId]);
  
    return (
      <Card className="h-full">
         <h3 className="text-lg font-semibold text-slate-800 mb-4">Frequência Mensal (6 Meses)</h3>
         <div className="h-64">
           <ResponsiveContainer width="100%" height="100%">
             <BarChart data={data} barGap={4}>
               <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
               <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8'}} />
               <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8'}} allowDecimals={false} />
               <Tooltip 
                 contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #f1f5f9' }} 
                 cursor={{fill: '#f1f5f9'}}
               />
               <Legend wrapperStyle={{ paddingTop: '10px' }} iconType="circle" />
               <Bar dataKey="presencas" name="Presenças" fill="#10B981" radius={[4, 4, 0, 0]} />
               <Bar dataKey="faltas" name="Faltas" fill="#EF4444" radius={[4, 4, 0, 0]} />
             </BarChart>
           </ResponsiveContainer>
         </div>
      </Card>
    );
};

export default StudentAttendanceChart;
