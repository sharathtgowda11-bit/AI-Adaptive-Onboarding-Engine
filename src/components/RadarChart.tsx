/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  RadarChart as RechartsRadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { AnalysisResult } from '../lib/types';

interface RadarChartProps {
  result: AnalysisResult;
}

export default function SkillRadarChart({ result }: RadarChartProps) {
  // Pick top 8 JD skills for the radar (readable)
  const topJdSkills = result.jd_skills
    .sort((a, b) => b.importance - a.importance)
    .slice(0, 8);

  const resumeMap: Record<string, number> = {};
  result.resume_skills.forEach(s => {
    resumeMap[s.skill] = s.proficiency;
  });

  const data = topJdSkills.map(jd => ({
    skill: jd.skill.length > 14 ? jd.skill.slice(0, 12) + '…' : jd.skill,
    fullSkill: jd.skill,
    required: Math.round(jd.required_level * 100),
    current: Math.round((resumeMap[jd.skill] || 0) * 100),
  }));

  return (
    <ResponsiveContainer width="100%" height="100%">
      <RechartsRadarChart data={data} cx="50%" cy="50%" outerRadius="70%">
        <PolarGrid stroke="rgba(255,255,255,0.08)" />
        <PolarAngleAxis
          dataKey="skill"
          tick={{ fill: '#94A3B8', fontSize: 11, fontFamily: 'DM Sans' }}
        />
        <PolarRadiusAxis
          angle={30}
          domain={[0, 100]}
          tick={{ fill: '#64748B', fontSize: 9 }}
          axisLine={false}
        />
        <Radar
          name="Required Level"
          dataKey="required"
          stroke="#7C3AED"
          fill="#7C3AED"
          fillOpacity={0.15}
          strokeWidth={2}
        />
        <Radar
          name="Your Level"
          dataKey="current"
          stroke="#00D4FF"
          fill="#00D4FF"
          fillOpacity={0.2}
          strokeWidth={2}
        />
        <Legend
          wrapperStyle={{ fontSize: '12px', fontFamily: 'DM Sans', color: '#94A3B8' }}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: '#111827',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '12px',
            fontSize: '12px',
            fontFamily: 'DM Sans',
            color: '#F1F5F9',
          }}
          formatter={(value: any, name: any) => [`${value}%`, name]}
        />
      </RechartsRadarChart>
    </ResponsiveContainer>
  );
}
