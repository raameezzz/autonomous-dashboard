import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ChatVolumePoint } from '../types';

interface Props {
  data: ChatVolumePoint[];
  loading?: boolean;
}

const BLUE = '#1B4DFF';
const PURPLE = '#C4B5FD';

function formatDay(s: string): string {
  const [, m, d] = s.split('-');
  return `${Number(m)}/${Number(d)}`;
}

export default function ChatVolumeChart({ data, loading }: Props) {
  return (
    <div className="bg-white rounded-card border border-surface-border p-5 shadow-card">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold text-ink">Chat Volume</h3>
          <p className="text-xs text-ink-muted">Daily, last {data.length} days</p>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm" style={{ background: BLUE }} />
            <span className="text-ink-muted">Chats handled</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm" style={{ background: PURPLE }} />
            <span className="text-ink-muted">AI resolved</span>
          </span>
        </div>
      </div>
      <div className="h-64">
        {loading ? (
          <div className="h-full skeleton rounded" />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} barCategoryGap="20%">
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
              <XAxis dataKey="date" tickFormatter={formatDay} tickLine={false} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} width={28} />
              <Tooltip
                cursor={{ fill: 'rgba(15,23,42,0.04)' }}
                contentStyle={{ fontSize: 12 }}
                labelFormatter={(v) => `Date: ${v}`}
              />
              <Bar dataKey="total" name="Chats handled" fill={BLUE} radius={[4, 4, 0, 0]} />
              <Bar dataKey="ai_resolved" name="AI resolved" fill={PURPLE} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
