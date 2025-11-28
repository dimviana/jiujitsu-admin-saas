

import React, { useState } from 'react';
import { Student, Graduation } from '../types';
import { Search, MoreVertical, MessageCircle, Award } from 'lucide-react';

interface StudentListProps {
  students: Student[];
  graduations: Graduation[];
  onUpdateStudent: (updatedStudent: Student) => void;
}

export const StudentList: React.FC<StudentListProps> = ({ students, graduations }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterBelt, setFilterBelt] = useState('all');

  const filteredStudents = students.filter(student => {
    const matchesSearch = student.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          student.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesBelt = filterBelt === 'all' || student.beltId === filterBelt;
    return matchesSearch && matchesBelt;
  });

  const getBeltStyle = (beltId: string) => {
    const belt = graduations.find(g => g.id === beltId);
    if (!belt) return { backgroundColor: '#ccc' };
    
    if (belt.color2) {
        const angle = belt.gradientAngle ?? 90;
        const hardness = (belt.gradientHardness ?? 0) / 100;
        const color3 = belt.color3 || belt.color2;

        const c1End = 33.33 * hardness;
        const c2Start = 50 - (16.67 * hardness);
        const c2End = 50 + (16.67 * hardness);
        const c3Start = 100 - (33.33 * hardness);

        return {
            background: `linear-gradient(${angle}deg,
                ${belt.color} 0%,
                ${belt.color} ${c1End}%,
                ${belt.color2} ${c2Start}%,
                ${belt.color2} ${c2End}%,
                ${color3} ${c3Start}%,
                ${color3} 100%
            )`
        };
    }
    return { backgroundColor: belt.color };
  };

  const handleWhatsAppClick = (phone: string | undefined) => {
      if (!phone) return;
      const cleanPhone = phone.replace(/\D/g, '');
      const url = `https://wa.me/55${cleanPhone}`;
      window.open(url, '_blank');
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
      {/* Filters */}
      <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Buscar aluno por nome ou email..."
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select
          className="px-4 py-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary"
          value={filterBelt}
          onChange={(e) => setFilterBelt(e.target.value)}
        >
          <option value="all">Todas as Faixas</option>
          {graduations.map(g => (
            <option key={g.id} value={g.id}>{g.name}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-slate-50 text-slate-500 text-sm uppercase">
            <tr>
              <th className="px-6 py-4 font-semibold">Aluno</th>
              <th className="px-6 py-4 font-semibold">Graduação</th>
              <th className="px-6 py-4 font-semibold">Contato</th>
              <th className="px-6 py-4 font-semibold">Status Financeiro</th>
              <th className="px-6 py-4 font-semibold">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredStudents.map((student) => (
              <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center">
                    <img 
                      src={student.imageUrl || `https://ui-avatars.com/api/?name=${student.name}`} 
                      alt={student.name} 
                      className="w-10 h-10 rounded-full object-cover mr-4 border-2 border-white shadow-sm"
                    />
                    <div>
                      <p className="font-medium text-slate-800">{student.name}</p>
                      <p className="text-xs text-slate-500">{student.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center space-x-2">
                     <div 
                        className="w-24 h-6 rounded flex items-center justify-end px-1 shadow-sm border border-slate-200"
                        style={getBeltStyle(student.beltId)}
                     >
                        {student.beltId !== 'black' && student.beltId !== 'white' && (
                             <div className="w-6 h-full bg-black ml-auto relative">
                                  {/* Stripes */}
                                  <div className="absolute flex space-x-[2px] right-1 top-0 bottom-0 items-center">
                                     {Array.from({ length: student.stripes }).map((_, i) => (
                                         <div key={i} className="w-1 h-3 bg-white"></div>
                                     ))}
                                  </div>
                             </div>
                        )}
                         {student.beltId === 'black' && (
                             <div className="w-8 h-full bg-red-600 ml-auto flex items-center justify-center">
                                 {/* Example Professor bar */}
                             </div>
                        )}
                     </div>
                     <span className="text-sm text-slate-600">{graduations.find(g => g.id === student.beltId)?.name}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-slate-600 font-medium">{student.phone || 'N/A'}</span>
                        {student.phone && (
                            <button 
                                onClick={() => handleWhatsAppClick(student.phone)}
                                className="p-2 bg-green-500 text-white rounded-full hover:bg-green-600 transition-colors shadow-sm"
                                title="Abrir WhatsApp"
                            >
                                <MessageCircle className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </td>
                <td className="px-6 py-4">
                  {student.paymentStatus === 'paid' ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Em Dia
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                      Pendente
                    </span>
                  )}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center space-x-2">
                    <button className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-full transition-colors" title="Graduar">
                       <Award className="w-5 h-5" />
                    </button>
                    <button className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors" title="Mais Opções">
                      <MoreVertical className="w-5 h-5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {filteredStudents.length === 0 && (
          <div className="p-10 text-center text-slate-500">
              Nenhum aluno encontrado.
          </div>
      )}
    </div>
  );
};