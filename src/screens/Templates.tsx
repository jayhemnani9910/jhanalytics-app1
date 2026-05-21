import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { useT } from '../i18n/useT';
import { upsertTemplate, deleteTemplate } from '../firebase/repo';
import type { Template, TemplateField, Gender } from '../types';

export function Templates() {
  const t = useT();
  const templates = useStore((s) => s.templates);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  
  // Form states for creating a new template
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateGender, setNewTemplateGender] = useState<Gender | ''>('');

  // Editing template local copy state
  const [editTemplate, setEditTemplate] = useState<Template | null>(null);

  const handleSelectTemplate = (tpl: Template) => {
    setSelectedTemplate(tpl);
    setEditTemplate(JSON.parse(JSON.stringify(tpl))); // deep clone
    setShowAddForm(false);
  };

  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTemplateName.trim()) return;

    const newTpl: Template = {
      id: crypto.randomUUID(),
      name: newTemplateName.trim(),
      gender: newTemplateGender === '' ? undefined : newTemplateGender,
      fields: [],
      isDefault: false,
      createdAt: Date.now(),
    };

    try {
      await upsertTemplate(newTpl);
      setNewTemplateName('');
      setNewTemplateGender('');
      setShowAddForm(false);
      // Automatically select for editing
      setSelectedTemplate(newTpl);
      setEditTemplate(newTpl);
    } catch (err) {
      console.error('Error creating template:', err);
    }
  };

  const handleAddField = () => {
    if (!editTemplate) return;
    const newField: TemplateField = {
      id: crypto.randomUUID(),
      label: '',
      unit: 'in',
    };
    setEditTemplate({
      ...editTemplate,
      fields: [...editTemplate.fields, newField],
    });
  };

  const handleFieldChange = (index: number, patch: Partial<TemplateField>) => {
    if (!editTemplate) return;
    const updatedFields = [...editTemplate.fields];
    updatedFields[index] = { ...updatedFields[index], ...patch };
    setEditTemplate({
      ...editTemplate,
      fields: updatedFields,
    });
  };

  const handleRemoveField = (index: number) => {
    if (!editTemplate) return;
    const updatedFields = editTemplate.fields.filter((_, i) => i !== index);
    setEditTemplate({
      ...editTemplate,
      fields: updatedFields,
    });
  };

  const handleMoveField = (index: number, direction: 'up' | 'down') => {
    if (!editTemplate) return;
    const fields = [...editTemplate.fields];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= fields.length) return;
    
    // Swap
    const temp = fields[index];
    fields[index] = fields[targetIndex];
    fields[targetIndex] = temp;

    setEditTemplate({
      ...editTemplate,
      fields,
    });
  };

  const handleSaveTemplate = async () => {
    if (!editTemplate) return;
    
    // Filter out fields with empty labels
    const cleanedFields = editTemplate.fields.filter((f) => f.label.trim() !== '');
    const templateToSave = {
      ...editTemplate,
      fields: cleanedFields,
    };

    try {
      await upsertTemplate(templateToSave);
      setSelectedTemplate(null);
      setEditTemplate(null);
    } catch (err) {
      console.error('Error saving template:', err);
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this template?')) return;
    try {
      await deleteTemplate(id);
      setSelectedTemplate(null);
      setEditTemplate(null);
    } catch (err) {
      console.error('Error deleting template:', err);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.layout}>
        {/* Left side: List of Templates */}
        <div style={styles.listSection}>
          <div style={styles.headerRow}>
            <h1 style={styles.title}>{t('templates.title')}</h1>
            <button
              onClick={() => {
                setShowAddForm(!showAddForm);
                setSelectedTemplate(null);
                setEditTemplate(null);
              }}
              style={styles.addBtn}
            >
              {showAddForm ? t('common.cancel') : `+ ${t('templates.addTemplate')}`}
            </button>
          </div>

          {showAddForm && (
            <form onSubmit={handleCreateTemplate} style={styles.addForm}>
              <div style={styles.formGroup}>
                <label style={styles.label}>{t('templates.name')}</label>
                <input
                  type="text"
                  value={newTemplateName}
                  onChange={(e) => setNewTemplateName(e.target.value)}
                  placeholder="e.g., Kurta, Waistcoat"
                  required
                  style={styles.input}
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>{t('templates.gender')}</label>
                <select
                  value={newTemplateGender}
                  onChange={(e) => setNewTemplateGender(e.target.value as Gender | '')}
                  style={styles.select}
                >
                  <option value="">{t('templates.gender.any')}</option>
                  <option value="female">{t('templates.gender.female')}</option>
                  <option value="male">{t('templates.gender.male')}</option>
                  <option value="other">{t('templates.gender.other')}</option>
                </select>
              </div>
              <button type="submit" style={styles.saveBtn}>
                {t('common.save')}
              </button>
            </form>
          )}

          <div style={styles.templatesGrid}>
            {templates.length === 0 ? (
              <div style={styles.emptyText}>{t('templates.empty')}</div>
            ) : (
              templates.map((tpl) => {
                const isSelected = selectedTemplate?.id === tpl.id;
                return (
                  <div
                    key={tpl.id}
                    onClick={() => handleSelectTemplate(tpl)}
                    style={{
                      ...styles.templateCard,
                      border: isSelected ? '1px solid var(--accent)' : '1px solid var(--border)',
                      background: isSelected ? 'color-mix(in srgb, var(--accent) 15%, transparent)' : 'var(--surface)',
                    }}
                  >
                    <div style={styles.cardHeader}>
                      <span style={styles.cardTitle}>{tpl.name}</span>
                      {tpl.isDefault && <span style={styles.badge}>System</span>}
                    </div>
                    <div style={styles.cardMeta}>
                      <span>
                        {tpl.gender
                          ? t(`templates.gender.${tpl.gender}`)
                          : t('templates.gender.any')}
                      </span>
                      <span>•</span>
                      <span>{tpl.fields.length} {t('templates.fields')}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right side / Bottom: Editing Panel */}
        {editTemplate && (
          <div style={styles.editorSection}>
            <div style={styles.editorHeader}>
              <h2 style={styles.editorTitle}>
                {t('templates.edit')}: {editTemplate.name}
              </h2>
              <button
                onClick={() => handleDeleteTemplate(editTemplate.id)}
                style={styles.deleteBtn}
              >
                {t('templates.delete')}
              </button>
            </div>

            <div style={styles.fieldsContainer}>
              <h3 style={styles.sectionHeading}>{t('templates.fields')}</h3>
              
              {editTemplate.fields.map((field, index) => (
                <div key={field.id} style={styles.fieldRow}>
                  <div style={styles.rowActions}>
                    <button
                      onClick={() => handleMoveField(index, 'up')}
                      disabled={index === 0}
                      style={styles.iconBtn}
                    >
                      ▲
                    </button>
                    <button
                      onClick={() => handleMoveField(index, 'down')}
                      disabled={index === editTemplate.fields.length - 1}
                      style={styles.iconBtn}
                    >
                      ▼
                    </button>
                  </div>
                  <input
                    type="text"
                    value={field.label}
                    onChange={(e) => handleFieldChange(index, { label: e.target.value })}
                    placeholder={t('templates.fieldName')}
                    style={styles.fieldInput}
                  />
                  <select
                    value={field.unit}
                    onChange={(e) => handleFieldChange(index, { unit: e.target.value })}
                    style={styles.unitSelect}
                  >
                    <option value="in">in</option>
                    <option value="cm">cm</option>
                  </select>
                  <button
                    onClick={() => handleRemoveField(index)}
                    style={styles.removeBtn}
                  >
                    ✕
                  </button>
                </div>
              ))}

              <button onClick={handleAddField} style={styles.addFieldBtn}>
                + {t('templates.addField')}
              </button>
            </div>

            <div style={styles.editorActions}>
              <button
                onClick={() => {
                  setSelectedTemplate(null);
                  setEditTemplate(null);
                }}
                style={styles.cancelBtn}
              >
                {t('common.cancel')}
              </button>
              <button onClick={handleSaveTemplate} style={styles.saveBtn}>
                {t('templates.save')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '24px 16px 88px 16px',
    minHeight: '100vh',
    background: 'var(--bg)',
    color: 'var(--text)',
    fontFamily: '"Inter", "Noto Sans Gujarati", sans-serif',
    boxSizing: 'border-box',
  },
  layout: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
    maxWidth: '900px',
    margin: '0 auto',
  },
  listSection: {
    flex: 1,
  },
  headerRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '20px',
  },
  title: {
    fontSize: 'calc(24px * var(--font-scale))',
    fontWeight: '600',
    margin: 0,
  },
  addBtn: {
    padding: '8px 16px',
    borderRadius: '8px',
    border: 'none',
    background: 'linear-gradient(135deg, #a855f7, #7c3aed)',
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 'calc(14px * var(--font-scale))',
    cursor: 'pointer',
    boxShadow: 'none',
  },
  addForm: {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: '12px',
    padding: '16px',
    marginBottom: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  label: {
    fontSize: 'calc(14px * var(--font-scale))',
    fontWeight: '500',
    color: 'var(--text-muted)',
  },
  input: {
    padding: '10px 12px',
    borderRadius: '6px',
    border: '1px solid var(--border)',
    background: 'var(--surface-2)',
    color: 'var(--text)',
    fontSize: 'calc(14px * var(--font-scale))',
    outline: 'none',
  },
  select: {
    padding: '10px 12px',
    borderRadius: '6px',
    border: '1px solid var(--border)',
    background: 'var(--surface-2)',
    color: 'var(--text)',
    fontSize: 'calc(14px * var(--font-scale))',
    outline: 'none',
  },
  templatesGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  templateCard: {
    borderRadius: '12px',
    padding: '16px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '8px',
  },
  cardTitle: {
    fontSize: 'calc(16px * var(--font-scale))',
    fontWeight: '600',
  },
  badge: {
    fontSize: 'calc(10px * var(--font-scale))',
    fontWeight: '700',
    background: 'color-mix(in srgb, var(--text) 15%, transparent)',
    color: 'var(--text)',
    padding: '2px 6px',
    borderRadius: '4px',
    letterSpacing: '0.5px',
  },
  cardMeta: {
    display: 'flex',
    gap: '8px',
    fontSize: 'calc(13px * var(--font-scale))',
    color: 'var(--text-muted)',
  },
  emptyText: {
    textAlign: 'center',
    padding: '32px',
    color: 'var(--text-muted)',
    fontSize: 'calc(14px * var(--font-scale))',
  },
  editorSection: {
    flex: 1,
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: '16px',
    padding: '20px',
    backdropFilter: 'blur(10px)',
  },
  editorHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '20px',
    borderBottom: '1px solid var(--border)',
    paddingBottom: '12px',
  },
  editorTitle: {
    fontSize: 'calc(18px * var(--font-scale))',
    fontWeight: '600',
    margin: 0,
  },
  deleteBtn: {
    padding: '6px 12px',
    borderRadius: '6px',
    border: '1px solid color-mix(in srgb, var(--danger) 40%, transparent)',
    background: 'color-mix(in srgb, var(--danger) 10%, transparent)',
    color: 'var(--danger)',
    fontSize: 'calc(12px * var(--font-scale))',
    fontWeight: '600',
    cursor: 'pointer',
  },
  fieldsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    marginBottom: '24px',
  },
  sectionHeading: {
    fontSize: 'calc(14px * var(--font-scale))',
    fontWeight: '600',
    color: 'var(--accent)',
    margin: '0 0 4px 0',
  },
  fieldRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    background: 'var(--surface-2)',
    padding: '8px 12px',
    borderRadius: '8px',
    border: '1px solid var(--border)',
  },
  rowActions: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  iconBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--text-muted)',
    fontSize: '8px',
    cursor: 'pointer',
    padding: 0,
    width: '14px',
    height: '14px',
  },
  fieldInput: {
    flex: 1,
    padding: '6px 10px',
    borderRadius: '4px',
    border: '1px solid var(--border)',
    background: 'var(--surface)',
    color: 'var(--text)',
    fontSize: 'calc(14px * var(--font-scale))',
    outline: 'none',
  },
  unitSelect: {
    padding: '6px 8px',
    borderRadius: '4px',
    border: '1px solid var(--border)',
    background: 'var(--surface)',
    color: 'var(--text)',
    fontSize: 'calc(14px * var(--font-scale))',
    outline: 'none',
  },
  removeBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--text-muted)',
    fontSize: 'calc(16px * var(--font-scale))',
    cursor: 'pointer',
    padding: '0 4px',
  },
  addFieldBtn: {
    padding: '10px',
    borderRadius: '8px',
    border: '1px dashed var(--border)',
    background: 'none',
    color: 'var(--text-muted)',
    fontSize: 'calc(14px * var(--font-scale))',
    fontWeight: '500',
    cursor: 'pointer',
    textAlign: 'center',
    transition: 'all 0.2s ease',
  },
  editorActions: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: '12px',
  },
  cancelBtn: {
    padding: '10px 16px',
    borderRadius: '8px',
    border: '1px solid var(--border)',
    background: 'none',
    color: 'var(--text-muted)',
    fontSize: 'calc(14px * var(--font-scale))',
    fontWeight: '600',
    cursor: 'pointer',
  },
  saveBtn: {
    padding: '10px 16px',
    borderRadius: '8px',
    border: 'none',
    background: 'linear-gradient(135deg, #a855f7, #7c3aed)',
    color: '#ffffff',
    fontSize: 'calc(14px * var(--font-scale))',
    fontWeight: '600',
    cursor: 'pointer',
    boxShadow: 'none',
  },
};
