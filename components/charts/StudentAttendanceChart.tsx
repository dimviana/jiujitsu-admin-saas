import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import Card from '../ui/Card';

const StudentAttendanceChart: React.FC<{ studentId: string }> = ({ studentId }) => {
    // Mock data based on studentId (randomized for demo)
    const data = [
      { name: 'Jan', classes: Math.floor(Math.random() * 15) + 5 },
      { name: 'Fev', classes: Math.floor(Math.random() * 15) + 5 },
      { name: 'Mar', classes: Math.floor(Math.random() * 15) + 5 },
      { name: 'Abr', classes: Math.floor(Math.random() * 15) + 5 },
      { name: 'Mai', classes: Math.floor(Math.random() * 15) + 5 },
      { name: 'Jun', classes: Math.floor(Math.random() * 15) + 5 },
    ];
  
    return (
      <Card className="h-full">
         <h3 className="text-lg font-semibold text-slate-800 mb-4">Frequência Mensal</h3>
         <div className="h-64">
           <ResponsiveContainer width="100%" height="100%">
             <BarChart data={data}>
               <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
               <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8'}} />
               <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8'}} />
               <Tooltip 
                 contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #f1f5f9' }} 
                 cursor={{fill: '#f1f5f9'}}
               />
               <Bar dataKey="classes" fill="#f59e0b" radius={[4, 4, 0, 0]} />
             </BarChart>
           </ResponsiveContainer>
         </div>
      </Card>
    );
};

export default StudentAttendanceChart;