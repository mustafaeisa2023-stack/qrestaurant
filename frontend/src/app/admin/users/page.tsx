'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit3, Trash2, ShieldCheck, ShieldAlert, User } from 'lucide-react';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import api, { unwrap } from '@/lib/api';
import { useTranslation } from '@/lib/i18n';
import type { User as UserType } from '@/types';

const usersService = {
  getAll:       async () => unwrap<UserType[]>(await api.get('/v1/users')),
  create:       async (data: any) => unwrap<UserType>(await api.post('/v1/users', data)),
  update:       async (id: string, data: any) => unwrap<UserType>(await api.put(`/v1/users/${id}`, data)),
  toggleActive: async (id: string) => unwrap<UserType>(await api.patch(`/v1/users/${id}/toggle-active`)),
  delete:       async (id: string) => { await api.delete(`/v1/users/${id}`); },
};

const userSchema = z.object({
  name:     z.string().min(2, 'Name too short'),
  email:    z.string().email('Invalid email'),
  role:     z.enum(['ADMIN', 'STAFF']),
  password: z.string().min(8, 'Min 8 chars').optional().or(z.literal('')),
});
type UserForm = z.infer<typeof userSchema>;

const ROLE_CONFIG = {
  SUPER_ADMIN: { icon: ShieldCheck, color: '#7c3aed', bg: 'rgba(124,58,237,0.10)', border: 'rgba(124,58,237,0.25)' },
  ADMIN:       { icon: ShieldAlert, color: '#2563eb', bg: 'rgba(37,99,235,0.10)',   border: 'rgba(37,99,235,0.25)'   },
  STAFF:       { icon: User,        color: '#6b7280', bg: 'rgba(107,114,128,0.10)', border: 'rgba(107,114,128,0.2)'  },
};

export default function UsersPage() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const [showForm, setShowForm] = useState(false);
  const [editUser, setEditUser] = useState<UserType | null>(null);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn:  usersService.getAll,
  });

  const { mutate: toggleActive } = useMutation({
    mutationFn: (id: string) => usersService.toggleActive(id),
    onSuccess: (u) => {
      toast.success(`${u.name} ${u.isActive ? t('active') : t('inactive')}`);
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  const { mutate: deleteUser } = useMutation({
    mutationFn: usersService.delete,
    onSuccess: () => { toast.success(t('delete')); queryClient.invalidateQueries({ queryKey: ['users'] }); },
    onError:   () => toast.error('Cannot delete this user'),
  });

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '22px', letterSpacing: '0.06em', color: 'var(--text-primary)' }}>
            {t('team')}
          </h1>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '3px', fontFamily: 'var(--font-mono)' }}>
            {users.length} {users.length !== 1 ? 'users' : 'user'}
          </p>
        </div>
        <button onClick={() => { setEditUser(null); setShowForm(true); }} className="btn-primary flex items-center gap-2 py-2">
          <Plus size={17} /> {t('addUser')}
        </button>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-20 shimmer rounded-2xl" />)}</div>
      ) : (
        <div className="card overflow-hidden">
          {users.map((user, idx) => {
            const roleCfg  = ROLE_CONFIG[user.role] || ROLE_CONFIG.STAFF;
            const RoleIcon = roleCfg.icon;
            const roleLabel = user.role === 'SUPER_ADMIN' ? t('superAdmin') : user.role === 'ADMIN' ? t('admin') : t('staff');
            return (
              <div
                key={user.id}
                className="flex items-center gap-4 px-5 py-4 transition-colors"
                style={{ borderTop: idx > 0 ? '1px solid var(--border-subtle)' : 'none' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-elevated)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                {/* Avatar */}
                <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: 'var(--brand-subtle)', border: '1.5px solid var(--brand-border)' }}>
                  <span style={{ color: 'var(--brand)', fontWeight: '700', fontFamily: 'var(--font-display)' }}>
                    {user.name.charAt(0).toUpperCase()}
                  </span>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p style={{ fontWeight: '600', color: 'var(--text-primary)', fontSize: '14px' }}>{user.name}</p>
                    <span className="badge" style={{ background: roleCfg.bg, color: roleCfg.color, borderColor: roleCfg.border }}>
                      <RoleIcon size={10} />
                      {roleLabel}
                    </span>
                    {!user.isActive && (
                      <span className="badge" style={{ background: 'rgba(220,38,38,0.08)', color: '#dc2626', borderColor: 'rgba(220,38,38,0.2)' }}>
                        {t('inactive')}
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px', fontFamily: 'var(--font-mono)' }}>
                    {user.email}
                  </p>
                  {user.lastLoginAt && (
                    <p style={{ fontSize: '11px', color: 'var(--text-disabled)', marginTop: '2px', fontFamily: 'var(--font-mono)' }}>
                      Last login: {new Date(user.lastLoginAt).toLocaleDateString()}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    onClick={() => toggleActive(user.id)}
                    className="px-3 py-1.5 rounded-xl text-xs font-medium transition-colors"
                    style={{
                      fontFamily: 'var(--font-display)',
                      letterSpacing: '0.05em',
                      background:   user.isActive ? 'rgba(220,38,38,0.08)' : 'rgba(22,163,74,0.08)',
                      color:        user.isActive ? '#dc2626'               : '#16a34a',
                      border:       user.isActive ? '1px solid rgba(220,38,38,0.2)' : '1px solid rgba(22,163,74,0.2)',
                    }}
                  >
                    {user.isActive ? 'Deactivate' : t('active')}
                  </button>

                  {user.role !== 'SUPER_ADMIN' && (
                    <>
                      <button
                        onClick={() => { setEditUser(user); setShowForm(true); }}
                        className="p-2 rounded-xl transition-colors"
                        style={{ color: '#2563eb', background: 'rgba(37,99,235,0.06)', border: '1px solid rgba(37,99,235,0.15)' }}
                      >
                        <Edit3 size={14} />
                      </button>
                      <button
                        onClick={() => { if (confirm(`${t('delete')} ${user.name}?`)) deleteUser(user.id); }}
                        className="p-2 rounded-xl transition-colors"
                        style={{ color: '#dc2626', background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.15)' }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showForm && (
        <UserFormModal
          user={editUser}
          onClose={() => { setShowForm(false); setEditUser(null); }}
          onSaved={() => { setShowForm(false); setEditUser(null); queryClient.invalidateQueries({ queryKey: ['users'] }); }}
        />
      )}
    </div>
  );
}

// ── Form Modal ────────────────────────────────────────────

function UserFormModal({ user, onClose, onSaved }: {
  user: UserType | null; onClose: () => void; onSaved: () => void;
}) {
  const { t } = useTranslation();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<UserForm>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      name:     user?.name  ?? '',
      email:    user?.email ?? '',
      role:     (user?.role === 'SUPER_ADMIN' ? 'ADMIN' : user?.role) ?? 'STAFF',
      password: '',
    },
  });

  const onSubmit = async (data: UserForm) => {
    try {
      const payload = { ...data, password: data.password || undefined };
      if (user) {
        await usersService.update(user.id, payload);
        toast.success(t('update'));
      } else {
        if (!data.password) { toast.error('Password required'); return; }
        await usersService.create(payload);
        toast.success(t('addUser'));
      }
      onSaved();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to save');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
      <div className="rounded-3xl w-full max-w-sm shadow-modal" style={{ background: 'var(--bg-surface)', border: '1.5px solid var(--border-default)' }}>
        <div className="p-5 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)', letterSpacing: '0.06em' }}>
            {user ? t('edit') : t('addUser')}
          </h3>
          <button onClick={onClose} style={{ color: 'var(--text-muted)', padding: '6px', borderRadius: '8px', cursor: 'pointer' }}>✕</button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              {t('name')} *
            </label>
            <input {...register('name')} className="input" placeholder="John Smith" />
            {errors.name && <p style={{ color: '#dc2626', fontSize: '11px', marginTop: '4px' }}>{errors.name.message}</p>}
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              {t('email')} *
            </label>
            <input {...register('email')} type="email" className="input" />
            {errors.email && <p style={{ color: '#dc2626', fontSize: '11px', marginTop: '4px' }}>{errors.email.message}</p>}
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              {t('role')}
            </label>
            <select {...register('role')} className="input">
              <option value="STAFF">{t('staff')}</option>
              <option value="ADMIN">{t('admin')}</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              {t('password')} {user ? '(leave blank to keep)' : '*'}
            </label>
            <input {...register('password')} type="password" className="input" placeholder="Min 8 characters" />
            {errors.password && <p style={{ color: '#dc2626', fontSize: '11px', marginTop: '4px' }}>{errors.password.message}</p>}
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 py-2.5">{t('cancel')}</button>
            <button type="submit" disabled={isSubmitting} className="btn-primary flex-1 py-2.5">
              {isSubmitting ? t('loading') : user ? t('update') : t('create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}