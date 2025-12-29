// ============================================================
// Immersa 3D - PBR Material Editor Component
// Visual editor for PBR material parameters
// ============================================================

import { useCallback, useState } from 'react';
import type { PBRMaterialParams, MaterialPreset } from '../GeometryMaterialModule';
import { geometryMaterialModule } from '../GeometryMaterialModule';
import styles from './PBRMaterialEditor.module.css';

/**
 * PBR Material Editor Props
 */
interface PBRMaterialEditorProps {
  /** Current PBR parameters */
  params: PBRMaterialParams;
  /** Material presets */
  presets?: MaterialPreset[];
  /** Callback when parameters change */
  onChange: (params: Partial<PBRMaterialParams>) => void;
  /** Callback when preset is selected */
  onPresetSelect?: (presetId: string) => void;
  /** Whether editing is disabled */
  disabled?: boolean;
}

/**
 * Slider component for material parameters
 */
interface SliderProps {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}

function Slider({ 
  label, 
  value, 
  min = 0, 
  max = 1, 
  step = 0.01, 
  onChange,
  disabled = false,
}: SliderProps) {
  return (
    <div className={styles.sliderRow}>
      <label className={styles.sliderLabel}>{label}</label>
      <div className={styles.sliderWrapper}>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className={styles.slider}
          disabled={disabled}
        />
        <span className={styles.sliderValue}>{value.toFixed(2)}</span>
      </div>
    </div>
  );
}

/**
 * Color picker component
 */
interface ColorPickerProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

function ColorPicker({ label, value, onChange, disabled = false }: ColorPickerProps) {
  return (
    <div className={styles.colorRow}>
      <label className={styles.colorLabel}>{label}</label>
      <div className={styles.colorWrapper}>
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={styles.colorInput}
          disabled={disabled}
        />
        <span className={styles.colorValue}>{value.toUpperCase()}</span>
      </div>
    </div>
  );
}

/**
 * PBR Material Editor Component
 */
export function PBRMaterialEditor({
  params,
  presets,
  onChange,
  onPresetSelect,
  disabled = false,
}: PBRMaterialEditorProps) {
  const [showPresets, setShowPresets] = useState(false);
  const [activeSection, setActiveSection] = useState<'basic' | 'advanced' | 'emissive'>('basic');
  
  // Handle parameter changes
  const handleChange = useCallback((key: keyof PBRMaterialParams, value: number | string) => {
    onChange({ [key]: value });
  }, [onChange]);
  
  // Handle preset selection
  const handlePresetClick = useCallback((presetId: string) => {
    onPresetSelect?.(presetId);
    setShowPresets(false);
  }, [onPresetSelect]);
  
  // Reset to defaults
  const handleReset = useCallback(() => {
    geometryMaterialModule.resetPBRParams();
  }, []);
  
  // Group presets by category
  const groupedPresets = presets?.reduce((acc, preset) => {
    if (!acc[preset.category]) {
      acc[preset.category] = [];
    }
    acc[preset.category].push(preset);
    return acc;
  }, {} as Record<string, MaterialPreset[]>);
  
  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <h3 className={styles.title}>PBR Material</h3>
        <div className={styles.headerActions}>
          <button 
            className={styles.iconButton}
            onClick={() => setShowPresets(!showPresets)}
            title="Presets"
          >
            📋
          </button>
          <button 
            className={styles.iconButton}
            onClick={handleReset}
            title="Reset"
          >
            ↺
          </button>
        </div>
      </div>
      
      {/* Preset dropdown */}
      {showPresets && groupedPresets && (
        <div className={styles.presetsPanel}>
          {Object.entries(groupedPresets).map(([category, categoryPresets]) => (
            <div key={category} className={styles.presetCategory}>
              <div className={styles.presetCategoryTitle}>{category}</div>
              <div className={styles.presetGrid}>
                {categoryPresets.map((preset) => (
                  <button
                    key={preset.id}
                    className={styles.presetButton}
                    onClick={() => handlePresetClick(preset.id)}
                    disabled={disabled}
                  >
                    {preset.name}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Section tabs */}
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeSection === 'basic' ? styles.active : ''}`}
          onClick={() => setActiveSection('basic')}
        >
          Basic
        </button>
        <button
          className={`${styles.tab} ${activeSection === 'advanced' ? styles.active : ''}`}
          onClick={() => setActiveSection('advanced')}
        >
          Advanced
        </button>
        <button
          className={`${styles.tab} ${activeSection === 'emissive' ? styles.active : ''}`}
          onClick={() => setActiveSection('emissive')}
        >
          Emissive
        </button>
      </div>
      
      {/* Basic section */}
      {activeSection === 'basic' && (
        <div className={styles.section}>
          <ColorPicker
            label="Color"
            value={params.color}
            onChange={(v) => handleChange('color', v)}
            disabled={disabled}
          />
          <Slider
            label="Roughness"
            value={params.roughness}
            onChange={(v) => handleChange('roughness', v)}
            disabled={disabled}
          />
          <Slider
            label="Metalness"
            value={params.metalness}
            onChange={(v) => handleChange('metalness', v)}
            disabled={disabled}
          />
        </div>
      )}
      
      {/* Advanced section */}
      {activeSection === 'advanced' && (
        <div className={styles.section}>
          <Slider
            label="Env Map Intensity"
            value={params.envMapIntensity}
            min={0}
            max={3}
            onChange={(v) => handleChange('envMapIntensity', v)}
            disabled={disabled}
          />
          <Slider
            label="Normal Scale"
            value={params.normalScale}
            min={0}
            max={2}
            onChange={(v) => handleChange('normalScale', v)}
            disabled={disabled}
          />
          <Slider
            label="Displacement Scale"
            value={params.displacementScale}
            min={0}
            max={5}
            onChange={(v) => handleChange('displacementScale', v)}
            disabled={disabled}
          />
          <Slider
            label="AO Intensity"
            value={params.aoIntensity}
            onChange={(v) => handleChange('aoIntensity', v)}
            disabled={disabled}
          />
        </div>
      )}
      
      {/* Emissive section */}
      {activeSection === 'emissive' && (
        <div className={styles.section}>
          <ColorPicker
            label="Emissive Color"
            value={params.emissive}
            onChange={(v) => handleChange('emissive', v)}
            disabled={disabled}
          />
          <Slider
            label="Emissive Intensity"
            value={params.emissiveIntensity}
            min={0}
            max={5}
            onChange={(v) => handleChange('emissiveIntensity', v)}
            disabled={disabled}
          />
        </div>
      )}
    </div>
  );
}

export default PBRMaterialEditor;
