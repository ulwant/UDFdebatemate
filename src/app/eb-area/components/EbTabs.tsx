import type { EbAreaTab } from '../types';

type EbTabsProps = {
  activeTab: EbAreaTab;
  isAdmin: boolean;
  pendingProfilesCount: number;
  pendingCompetitionCount: number;
  onChange: (tab: EbAreaTab) => void;
};

export default function EbTabs({ activeTab, isAdmin, pendingProfilesCount, pendingCompetitionCount, onChange }: EbTabsProps) {
  return (
    <div style={{ marginBottom: '16px' }}>
      <select 
        className="input" 
        value={activeTab} 
        onChange={(e) => onChange(e.target.value as EbAreaTab)}
        aria-label="EB Area sections"
        style={{ width: '100%', maxWidth: '400px', cursor: 'pointer', fontWeight: 600 }}
      >
        <option value="attendance">Attendance</option>
        <option value="registrations">Registrations ({pendingProfilesCount})</option>
        <option value="competitionReview">Competition Review ({pendingCompetitionCount})</option>
        <option value="roles">Role Management</option>
        {isAdmin && <option value="authority">User Authority</option>}
      </select>
    </div>
  );
}

