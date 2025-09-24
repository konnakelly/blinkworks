'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuthContext } from '@/contexts/AuthContext';
import { 
  getBrandAssets, 
  uploadBrandAsset, 
  deleteBrandAsset, 
  updateBrandAsset,
  uploadFile,
  BrandAssets,
  BrandAsset 
} from '@/lib/firestore';
import { Upload, X, Edit, Download, FileText, Image, Palette, Type, BookOpen, Folder, Copy, Check } from 'lucide-react';
import { RoleGuard } from '@/components/RoleGuard';
import Navbar from '@/components/Navbar';

export default function BrandAssetsPage() {
  const { user } = useAuthContext();
  const [brandAssets, setBrandAssets] = useState<BrandAssets | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [editingAsset, setEditingAsset] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: '', description: '', type: 'OTHER' as BrandAsset['type'] });
  const [isDragOver, setIsDragOver] = useState(false);
  const [copiedAsset, setCopiedAsset] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<BrandAsset['type'] | 'ALL'>('ALL');
  const [expandedDescriptions, setExpandedDescriptions] = useState<Set<string>>(new Set());
  const [copiedColor, setCopiedColor] = useState<string | null>(null);
  const [showColorPaletteCreator, setShowColorPaletteCreator] = useState(false);
  const [colorPalette, setColorPalette] = useState<Array<{hex: string, name?: string}>>([]);
  const [newColor, setNewColor] = useState('');
  const [newColorName, setNewColorName] = useState('');

  const fetchBrandAssets = useCallback(async () => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }
    
    try {
      const assets = await getBrandAssets(user.uid);
      setBrandAssets(assets);
    } catch (error) {
      console.error('Error fetching brand assets:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.uid]);

  useEffect(() => {
    fetchBrandAssets();
  }, [user?.uid, fetchBrandAssets]);

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0 || !user?.uid) return;

    const file = files[0];
    
    // Validate file type
    const allowedTypes = [
      'image/', 'application/pdf', 'application/postscript', 
      'application/illustrator', 'application/photoshop',
      'font/', 'application/font-woff', 'application/font-woff2'
    ];
    
    const isValidType = allowedTypes.some(type => file.type.startsWith(type)) || 
                       file.name.match(/\.(ai|psd|eps|svg|ttf|otf|woff|woff2)$/i);
    
    if (!isValidType) {
      alert(`File type not supported. Please upload images, PDFs, or design files.`);
      return;
    }

    // Check if it's a font file
    const isFont = isFontFile(file.name);

    // Validate file size (max 50MB)
    if (file.size > 50 * 1024 * 1024) {
      alert(`File is too large. Maximum size is 50MB.`);
      return;
    }

    setUploading(true);
    try {
      // Upload file to Firebase Storage
      const fileUrl = await uploadFile(file, `brand-assets/${user.uid}`);
      
      // Create brand asset
      const asset = {
        name: file.name,
        type: isFont ? 'FONT' as BrandAsset['type'] : 'OTHER' as BrandAsset['type'],
        description: '',
        fileUrl,
        fileName: file.name,
        fileSize: file.size
      };

      await uploadBrandAsset(user.uid, asset);
      await fetchBrandAssets();
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Error uploading file. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    handleFileUpload(event.target.files);
  };

  const toggleDescriptionExpansion = (assetId: string) => {
    setExpandedDescriptions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(assetId)) {
        newSet.delete(assetId);
      } else {
        newSet.add(assetId);
      }
      return newSet;
    });
  };

  const addColorToPalette = () => {
    if (newColor && /^#[0-9A-F]{6}$/i.test(newColor)) {
      setColorPalette(prev => [...prev, { hex: newColor.toUpperCase(), name: newColorName || undefined }]);
      setNewColor('');
      setNewColorName('');
    }
  };

  const removeColorFromPalette = (index: number) => {
    setColorPalette(prev => prev.filter((_, i) => i !== index));
  };

  const createColorPaletteAsset = async () => {
    if (!user?.uid || colorPalette.length === 0) return;

    setUploading(true);
    try {
      // Create a visual representation of the color palette
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.width = 400;
      canvas.height = 200;
      
      // Draw color swatches
      const swatchWidth = canvas.width / colorPalette.length;
      colorPalette.forEach((color, index) => {
        ctx.fillStyle = color.hex;
        ctx.fillRect(index * swatchWidth, 0, swatchWidth, canvas.height);
      });

      // Convert to blob and upload
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
        }, 'image/png');
      });

      // Convert blob to file
      const file = new File([blob], 'color-palette.png', { type: 'image/png' });
      const fileUrl = await uploadFile(file, `brand-assets/${user.uid}`);
      
      // Create color palette asset
      const asset = {
        name: `Color Palette (${colorPalette.length} colors)`,
        type: 'COLOR_PALETTE' as BrandAsset['type'],
        description: `Brand colors: ${colorPalette.map(c => c.name ? `${c.name} (${c.hex})` : c.hex).join(', ')}`,
        fileUrl,
        fileName: 'color-palette.png',
        fileSize: blob.size
      };

      await uploadBrandAsset(user.uid, asset);
      await fetchBrandAssets();
      
      // Reset color palette creator
      setShowColorPaletteCreator(false);
      setColorPalette([]);
    } catch (error) {
      console.error('Error creating color palette:', error);
      alert('Error creating color palette. Please try again.');
    } finally {
      setUploading(false);
    }
  };


  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFileUpload(e.dataTransfer.files);
  };

  const handleDeleteAsset = async (assetId: string) => {
    if (!user?.uid) return;
    
    try {
      await deleteBrandAsset(user.uid, assetId);
      await fetchBrandAssets();
    } catch (error) {
      console.error('Error deleting asset:', error);
    }
  };

  const handleEditAsset = async (assetId: string) => {
    if (!user?.uid) return;
    
    try {
      await updateBrandAsset(user.uid, assetId, editForm);
      setEditingAsset(null);
      setEditForm({ name: '', description: '', type: 'OTHER' });
      await fetchBrandAssets();
    } catch (error) {
      console.error('Error updating asset:', error);
    }
  };

  const handleCopyAsset = async (asset: BrandAsset) => {
    try {
      // Check if it's an image file
      if (isImageFile(asset.fileUrl, asset.fileName)) {
        // For images, copy the actual image to clipboard
        const response = await fetch(asset.fileUrl);
        const blob = await response.blob();
        
        // Create a ClipboardItem with the image blob
        const clipboardItem = new ClipboardItem({
          [blob.type]: blob
        });
        
        await navigator.clipboard.write([clipboardItem]);
        setCopiedAsset(asset.id);
        
        // Reset the copied state after 2 seconds
        setTimeout(() => {
          setCopiedAsset(null);
        }, 2000);
      } else {
        // For non-image files, copy text information
        const assetInfo = `Asset: ${asset.name}
Type: ${asset.type.replace('_', ' ')}
Size: ${formatFileSize(asset.fileSize)}
URL: ${asset.fileUrl}
${asset.description ? `Description: ${asset.description}` : ''}`;

        await navigator.clipboard.writeText(assetInfo);
        setCopiedAsset(asset.id);
        
        // Reset the copied state after 2 seconds
        setTimeout(() => {
          setCopiedAsset(null);
        }, 2000);
      }
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      // Fallback: try to copy just the URL
      try {
        await navigator.clipboard.writeText(asset.fileUrl);
        setCopiedAsset(asset.id);
        setTimeout(() => setCopiedAsset(null), 2000);
      } catch (fallbackError) {
        console.error('Fallback copy also failed:', fallbackError);
      }
    }
  };

  const startEdit = (asset: BrandAsset) => {
    setEditingAsset(asset.id);
    setEditForm({
      name: asset.name,
      description: asset.description || '',
      type: asset.type
    });
  };

  const getAssetIcon = (type: BrandAsset['type']) => {
    switch (type) {
      case 'LOGO': return <Image className="w-5 h-5" />;
      case 'FONT': return <Type className="w-5 h-5" />;
      case 'COLOR_PALETTE': return <Palette className="w-5 h-5" />;
      case 'GUIDELINES': return <BookOpen className="w-5 h-5" />;
      case 'IMAGE': return <Image className="w-5 h-5" />;
      default: return <FileText className="w-5 h-5" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const isImageFile = (fileUrl: string, fileName: string) => {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp', '.bmp'];
    const extension = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
    return imageExtensions.includes(extension) || fileUrl.includes('image/');
  };

  const isFontFile = (fileName: string) => {
    const fontExtensions = ['.ttf', '.otf', '.woff', '.woff2', '.eot'];
    const extension = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
  return fontExtensions.includes(extension);
};

// Font Preview Component
const FontPreviewComponent = ({ fileUrl, fontName }: { fileUrl: string; fontName: string }) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const generatePreview = async () => {
      try {
        const preview = await generateFontPreview(fileUrl, fontName);
        setPreviewUrl(preview);
      } catch (error) {
        console.error('Error generating font preview:', error);
      } finally {
        setLoading(false);
      }
    };

    generatePreview();
  }, [fileUrl, fontName]);

  if (loading) {
    return (
      <div style={{
        width: '100%',
        height: '120px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--surface)',
        color: 'var(--text-light)'
      }}>
        <div style={{ fontSize: '12px' }}>Loading preview...</div>
      </div>
    );
  }

  if (previewUrl) {
    return (
      <img
        src={previewUrl}
        alt={`${fontName} font preview`}
        style={{
          width: '100%',
          height: '120px',
          objectFit: 'contain',
          display: 'block',
          background: 'white'
        }}
        onError={() => setPreviewUrl(null)}
      />
    );
  }

  // Fallback to icon if preview generation fails
  return (
    <div style={{
      width: '100%',
      height: '120px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, var(--primary-light-bg) 0%, #f8f9fa 100%)',
      color: 'var(--primary)',
      padding: '16px',
      textAlign: 'center'
    }}>
      <Type size={32} style={{ marginBottom: '8px' }} />
      <div style={{ fontSize: '12px', fontWeight: '500', marginBottom: '4px' }}>
        {fontName}
      </div>
      <div style={{ fontSize: '10px', color: 'var(--text-light)' }}>
        Font File
      </div>
    </div>
  );
};

// Color Palette Preview Component
const ColorPalettePreviewComponent = ({ fileUrl, description }: { fileUrl: string; description?: string }) => {
  const [colors, setColors] = useState<Array<{hex: string, name?: string}>>([]);
  const [loading, setLoading] = useState(true);
  const [hoveredColor, setHoveredColor] = useState<string | null>(null);

  useEffect(() => {
    const extractColors = async () => {
      try {
        // Extract colors from description if available
        if (description && description.includes('Brand colors:')) {
          // Parse both names and hex codes from description
          const colorMatches = description.match(/([^:]+?)\s*\(([^)]+)\)|#[0-9A-F]{6}/gi);
          if (colorMatches) {
            const parsedColors = colorMatches.map(match => {
              // Check if it's in "Name (HEX)" format
              const nameHexMatch = match.match(/([^(]+?)\s*\(([^)]+)\)/);
              if (nameHexMatch) {
                return {
                  name: nameHexMatch[1].trim(),
                  hex: nameHexMatch[2].trim()
                };
              } else {
                // Just HEX code
                return {
                  hex: match.trim()
                };
              }
            });
            setColors(parsedColors);
          }
        }
      } catch (error) {
        console.error('Error extracting colors:', error);
      } finally {
        setLoading(false);
      }
    };

    extractColors();
  }, [description]);

  if (loading) {
    return (
      <div style={{
        width: '100%',
        height: '120px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--surface)',
        color: 'var(--text-light)'
      }}>
        <div style={{ fontSize: '12px' }}>Loading colors...</div>
      </div>
    );
  }

  if (colors.length > 0) {
    return (
      <div style={{
        width: '100%',
        height: '120px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'white',
        border: '1px solid var(--border)',
        borderRadius: '8px'
      }}>
        <div style={{ 
          display: 'flex', 
          gap: '8px',
          alignItems: 'center',
          justifyContent: 'center',
          flexWrap: 'wrap',
          maxWidth: '100%',
          padding: '8px'
        }}>
          {colors.map((color, index) => (
            <div
              key={index}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                background: 'white',
                border: '1px solid var(--border)',
                borderRadius: '6px',
                padding: '6px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                minWidth: '60px'
              }}
            >
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  background: color.hex,
                  borderRadius: '4px',
                  border: '1px solid var(--border)',
                  marginBottom: '4px',
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'flex-end',
                  justifyContent: 'flex-end'
                }}
              >
                {/* HEX code and copy icon at bottom corner */}
                <div
                  style={{
                    position: 'absolute',
                    bottom: '2px',
                    right: '2px',
                    background: 'rgba(0,0,0,0.8)',
                    color: 'white',
                    fontSize: '6px',
                    fontWeight: '500',
                    padding: '1px 2px',
                    borderRadius: '2px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '2px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onClick={async (e) => {
                    e.stopPropagation();
                    try {
                      await navigator.clipboard.writeText(color.hex);
                    } catch (err) {
                      console.error('Failed to copy color:', err);
                    }
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(0,0,0,0.9)';
                    e.currentTarget.style.transform = 'scale(1.05)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(0,0,0,0.8)';
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                >
                  <span>{color.hex}</span>
                  <Copy size={6} />
                </div>
              </div>
              <div style={{ 
                fontSize: '10px', 
                fontWeight: '500', 
                color: 'var(--text)',
                textAlign: 'center',
                maxWidth: '50px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
                {color.name || color.hex}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Fallback to image preview
  return (
    <img
      src={fileUrl}
      alt="Color palette"
      style={{
        width: '100%',
        height: '120px',
        objectFit: 'cover',
        display: 'block'
      }}
    />
  );
};

const generateFontPreview = async (fileUrl: string, fontName: string) => {
    try {
      // Create a canvas to render font preview
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      canvas.width = 400;
      canvas.height = 200;

      // Load the font
      const font = new FontFace(fontName, `url(${fileUrl})`);
      await font.load();
      document.fonts.add(font);

      // Set font and render text
      ctx.fillStyle = '#333';
      ctx.font = '24px ' + fontName;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Render sample text
      ctx.fillText('The quick brown fox jumps over the lazy dog', 200, 80);
      ctx.fillText('ABCDEFGHIJKLMNOPQRSTUVWXYZ', 200, 120);
      ctx.fillText('0123456789', 200, 160);

      return canvas.toDataURL();
    } catch (error) {
      console.error('Error generating font preview:', error);
      return null;
    }
  };

  const getFilteredAssets = () => {
    if (!brandAssets?.assets) return [];
    if (activeFilter === 'ALL') return brandAssets.assets;
    return brandAssets.assets.filter(asset => asset.type === activeFilter);
  };

  const getFilterCounts = () => {
    if (!brandAssets?.assets) return {};
    const counts: Record<string, number> = { ALL: brandAssets.assets.length };
    brandAssets.assets.forEach(asset => {
      counts[asset.type] = (counts[asset.type] || 0) + 1;
    });
    return counts;
  };

  if (loading) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        background: 'var(--background)', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center' 
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '48px',
            height: '48px',
            border: '3px solid var(--border)',
            borderTop: '3px solid var(--primary)',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }}></div>
          <p style={{ color: 'var(--text-light)', margin: 0 }}>Loading brand assets...</p>
        </div>
      </div>
    );
  }

  return (
    <RoleGuard requiredRoles={['CLIENT']}>
      <Navbar />
      <div style={{ minHeight: '100vh', background: 'var(--background)' }}>
        <div style={{ 
          maxWidth: '1200px', 
          margin: '0 auto', 
          padding: '32px 24px' 
        }}>
          <div style={{ marginBottom: '32px' }}>
            <h1 style={{ 
              fontSize: '32px', 
              fontWeight: 'bold', 
              color: 'var(--text)', 
              marginBottom: '8px' 
            }}>
              Brand Assets
            </h1>
            <p style={{ 
              fontSize: '16px', 
              color: 'var(--text-light)', 
              margin: 0 
            }}>
              Upload and manage your brand assets for designers to use in your projects.
            </p>
          </div>

          {/* Upload Section */}
          <div className="card" style={{ marginBottom: '32px' }}>
            <div style={{ padding: '24px' }}>
              <h2 style={{ 
                fontSize: '20px', 
                fontWeight: '600', 
                color: 'var(--text)', 
                marginBottom: '16px' 
              }}>
                Upload New Asset
              </h2>
              <div 
                style={{
                  border: `2px dashed ${isDragOver ? 'var(--primary)' : 'var(--border)'}`,
                  borderRadius: '12px',
                  padding: '32px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  background: isDragOver ? 'var(--primary-light-bg)' : 'var(--surface)'
                }}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onMouseEnter={(e) => {
                  if (!isDragOver) {
                    e.currentTarget.style.borderColor = 'var(--primary)';
                    e.currentTarget.style.background = 'var(--primary-light-bg)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isDragOver) {
                    e.currentTarget.style.borderColor = 'var(--border)';
                    e.currentTarget.style.background = 'var(--surface)';
                  }
                }}
              >
                <input
                  type="file"
                  id="file-upload"
                  style={{ display: 'none' }}
                  onChange={handleFileInputChange}
                  disabled={uploading}
                  accept="image/*,application/pdf,.ai,.psd,.eps,.svg,.ttf,.otf,.woff,.woff2"
                />
                <label
                  htmlFor="file-upload"
                  style={{ 
                    cursor: 'pointer', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'center' 
                  }}
                >
                  <Upload style={{ 
                    width: '32px', 
                    height: '32px', 
                    color: isDragOver ? 'var(--primary)' : 'var(--text-light)', 
                    marginBottom: '12px' 
                  }} />
                  <span style={{ 
                    fontSize: '14px', 
                    fontWeight: '500', 
                    color: isDragOver ? 'var(--primary)' : 'var(--text)',
                    marginBottom: '4px'
                  }}>
                    {uploading ? 'Uploading...' : isDragOver ? 'Drop file here' : 'Click to upload or drag and drop'}
                  </span>
                  <span style={{ 
                    fontSize: '12px', 
                    color: 'var(--text-light)' 
                  }}>
                    PNG, JPG, PDF, AI, PSD, SVG, or other design files
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* Color Palette Creator */}
          <div className="card" style={{ marginBottom: '32px' }}>
            <div style={{ padding: '24px' }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                marginBottom: '16px' 
              }}>
                <h2 style={{ 
                  fontSize: '20px', 
                  fontWeight: '600', 
                  color: 'var(--text)',
                  margin: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <Palette size={20} />
                  Create Color Palette
                </h2>
                <button
                  onClick={() => setShowColorPaletteCreator(!showColorPaletteCreator)}
                  style={{
                    padding: '8px 16px',
                    border: '1px solid var(--primary)',
                    borderRadius: '6px',
                    background: showColorPaletteCreator ? 'var(--primary)' : 'white',
                    color: showColorPaletteCreator ? 'white' : 'var(--primary)',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500'
                  }}
                >
                  {showColorPaletteCreator ? 'Cancel' : 'Create Colors'}
                </button>
              </div>
              
              {showColorPaletteCreator && (
                <div style={{ 
                  border: '1px solid var(--border)', 
                  borderRadius: '8px', 
                  padding: '20px',
                  background: 'var(--surface)'
                }}>
                  {/* Add Color Form */}
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: '1fr 1fr auto', 
                      gap: '12px', 
                      alignItems: 'end' 
                    }}>
                      <div>
                        <label style={{ 
                          display: 'block', 
                          fontSize: '12px', 
                          fontWeight: '500', 
                          color: 'var(--text)', 
                          marginBottom: '4px' 
                        }}>
                          Color (HEX)
                        </label>
                        <input
                          type="color"
                          value={newColor}
                          onChange={(e) => setNewColor(e.target.value)}
                          style={{
                            width: '100%',
                            height: '40px',
                            border: '1px solid var(--border)',
                            borderRadius: '6px',
                            cursor: 'pointer'
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ 
                          display: 'block', 
                          fontSize: '12px', 
                          fontWeight: '500', 
                          color: 'var(--text)', 
                          marginBottom: '4px' 
                        }}>
                          Color Name (Optional)
                        </label>
                        <input
                          type="text"
                          value={newColorName}
                          onChange={(e) => setNewColorName(e.target.value)}
                          placeholder="e.g., Primary Blue"
                          style={{
                            width: '100%',
                            fontSize: '12px',
                            border: '1px solid var(--border)',
                            borderRadius: '6px',
                            padding: '8px',
                            background: 'white',
                            color: 'var(--text)'
                          }}
                        />
                      </div>
                      <button
                        onClick={addColorToPalette}
                        disabled={!newColor}
                        style={{
                          padding: '8px 16px',
                          border: 'none',
                          borderRadius: '6px',
                          background: newColor ? 'var(--primary)' : 'var(--border)',
                          color: 'white',
                          cursor: newColor ? 'pointer' : 'not-allowed',
                          fontSize: '12px',
                          fontWeight: '500',
                          height: '40px'
                        }}
                      >
                        Add Color
                      </button>
                    </div>
                  </div>

                  {/* Color Palette Preview */}
                  {colorPalette.length > 0 && (
                    <div style={{ marginBottom: '20px' }}>
                      <h4 style={{ 
                        fontSize: '14px', 
                        fontWeight: '500', 
                        color: 'var(--text)', 
                        marginBottom: '12px' 
                      }}>
                        Your Color Palette ({colorPalette.length} colors):
                      </h4>
                      <div style={{ 
                        display: 'flex', 
                        flexWrap: 'wrap', 
                        gap: '8px' 
                      }}>
                        {colorPalette.map((color, index) => (
                          <div
                            key={index}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              background: 'white',
                              border: '1px solid var(--border)',
                              borderRadius: '6px',
                              overflow: 'hidden'
                            }}
                          >
                            <div
                              style={{
                                width: '32px',
                                height: '32px',
                                background: color.hex
                              }}
                            />
                            <div style={{ padding: '4px 8px', fontSize: '11px' }}>
                              <div style={{ fontWeight: '500', color: 'var(--text)' }}>
                                {color.name || color.hex}
                              </div>
                              <div style={{ color: 'var(--text-light)' }}>
                                {color.hex}
                              </div>
                            </div>
                            <button
                              onClick={() => removeColorFromPalette(index)}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: 'var(--error)',
                                cursor: 'pointer',
                                padding: '4px 8px',
                                fontSize: '12px'
                              }}
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Create Palette Button */}
                  {colorPalette.length > 0 && (
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'flex-end',
                      gap: '12px'
                    }}>
                      <button
                        onClick={() => {
                          setShowColorPaletteCreator(false);
                          setColorPalette([]);
                        }}
                        style={{
                          padding: '8px 16px',
                          border: '1px solid var(--border)',
                          borderRadius: '6px',
                          background: 'white',
                          color: 'var(--text)',
                          cursor: 'pointer',
                          fontSize: '14px',
                          fontWeight: '500'
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={createColorPaletteAsset}
                        disabled={uploading}
                        style={{
                          padding: '8px 16px',
                          border: 'none',
                          borderRadius: '6px',
                          background: 'var(--primary)',
                          color: 'white',
                          cursor: uploading ? 'not-allowed' : 'pointer',
                          fontSize: '14px',
                          fontWeight: '500',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        {uploading ? 'Creating...' : 'Create Color Palette'}
                        {uploading && <div style={{
                          width: '12px',
                          height: '12px',
                          border: '2px solid transparent',
                          borderTop: '2px solid white',
                          borderRadius: '50%',
                          animation: 'spin 1s linear infinite'
                        }} />}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Filter Buttons */}
          {brandAssets?.assets && brandAssets.assets.length > 0 && (
            <div style={{ marginBottom: '32px' }}>
              <div style={{ 
                display: 'flex', 
                flexWrap: 'wrap', 
                gap: '12px', 
                alignItems: 'center',
                marginBottom: '16px'
              }}>
                <span style={{ 
                  fontSize: '14px', 
                  fontWeight: '500', 
                  color: 'var(--text)',
                  marginRight: '8px'
                }}>
                  Filter by type:
                </span>
                {[
                  { type: 'ALL' as const, label: 'All', icon: null },
                  { type: 'LOGO' as const, label: 'Logos', icon: <Image size={16} /> },
                  { type: 'FONT' as const, label: 'Fonts', icon: <Type size={16} /> },
                  { type: 'COLOR_PALETTE' as const, label: 'Colors', icon: <Palette size={16} /> },
                  { type: 'GUIDELINES' as const, label: 'Guidelines', icon: <BookOpen size={16} /> },
                  { type: 'IMAGE' as const, label: 'Images', icon: <Image size={16} /> },
                  { type: 'OTHER' as const, label: 'Other', icon: <FileText size={16} /> }
                ].map(({ type, label, icon }) => {
                  const counts = getFilterCounts();
                  const count = counts[type] || 0;
                  const isActive = activeFilter === type;
                  
                  return (
                    <button
                      key={type}
                      onClick={() => setActiveFilter(type)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 16px',
                        borderRadius: '20px',
                        border: `1px solid ${isActive ? 'var(--primary)' : 'var(--border)'}`,
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '500',
                        transition: 'all 0.2s ease',
                        background: isActive ? 'var(--primary)' : 'var(--surface)',
                        color: isActive ? 'white' : 'var(--text)',
                        boxShadow: isActive ? '0 2px 4px rgba(0,0,0,0.1)' : 'none'
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.background = 'var(--primary-light-bg)';
                          e.currentTarget.style.borderColor = 'var(--primary)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.background = 'var(--surface)';
                          e.currentTarget.style.borderColor = 'var(--border)';
                        }
                      }}
                    >
                      {icon}
                      <span>{label}</span>
                      <span style={{
                        background: isActive ? 'rgba(255,255,255,0.2)' : 'var(--primary-light-bg)',
                        color: isActive ? 'white' : 'var(--primary)',
                        padding: '2px 8px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: '600',
                        minWidth: '20px',
                        textAlign: 'center'
                      }}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Assets Grid */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', 
            gap: '24px' 
          }}>
            {getFilteredAssets().map((asset) => (
              <div key={asset.id} className="card">
                <div style={{ padding: '24px' }}>
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'flex-start', 
                    justifyContent: 'space-between', 
                    marginBottom: '16px' 
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ 
                        padding: '8px', 
                        background: 'var(--primary-light-bg)', 
                        borderRadius: '8px' 
                      }}>
                        {getAssetIcon(asset.type)}
                      </div>
                      <div>
                        {editingAsset === asset.id ? (
                          <input
                            type="text"
                            value={editForm.name}
                            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                            style={{
                              fontSize: '14px',
                              fontWeight: '500',
                              color: 'var(--text)',
                              background: 'white',
                              border: '1px solid var(--border)',
                              borderRadius: '6px',
                              padding: '4px 8px',
                              width: '100%'
                            }}
                            autoFocus
                          />
                        ) : (
                          <h3 style={{ 
                            fontSize: '14px', 
                            fontWeight: '500', 
                            color: 'var(--text)',
                            margin: 0,
                            marginBottom: '4px'
                          }}>
                            {asset.name}
                          </h3>
                        )}
                        <p style={{ 
                          fontSize: '12px', 
                          color: 'var(--text-light)',
                          margin: 0
                        }}>
                          {formatFileSize(asset.fileSize)}
                        </p>
                        
                        {/* Brand Colors Display */}
                        {asset.type === 'COLOR_PALETTE' && asset.description && asset.description.includes('Brand colors:') && (
                          <div style={{ marginTop: '8px' }}>
                            <div style={{ marginBottom: '8px', fontWeight: '500', fontSize: '12px', color: 'var(--text)' }}>
                              Brand colors:
                            </div>
                            {(() => {
                              console.log('Color palette asset:', asset);
                              return null;
                            })()}
                            {asset.description
                              .replace('Brand colors: ', '')
                              .split(', ')
                              .map((colorText, index) => {
                                const hexMatch = colorText.match(/#[0-9A-F]{6}/i);
                                const hex = hexMatch ? hexMatch[0] : '';
                                const name = colorText.replace(hex, '').replace(/[()]/g, '').trim();
                                
                                return (
                              <div key={index} style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '6px',
                                marginBottom: '4px',
                                padding: '4px 6px',
                                background: 'var(--surface)',
                                borderRadius: '4px',
                                border: '1px solid var(--border)'
                              }}>
                                <div style={{
                                  width: '16px',
                                  height: '16px',
                                  background: hex,
                                  borderRadius: '3px',
                                  border: '1px solid var(--border)',
                                  flexShrink: 0
                                }} />
                                <span style={{ flex: 1, fontSize: '11px' }}>
                                  {name && `${name} `}{hex}
                                </span>
                                <button
                                  onClick={async () => {
                                    try {
                                      await navigator.clipboard.writeText(hex);
                                      setCopiedColor(hex);
                                      setTimeout(() => setCopiedColor(null), 2000);
                                    } catch (err) {
                                      console.error('Failed to copy color:', err);
                                    }
                                  }}
                                  style={{
                                    background: copiedColor === hex ? 'var(--success)' : 'none',
                                    border: 'none',
                                    color: copiedColor === hex ? 'white' : 'var(--primary)',
                                    cursor: 'pointer',
                                    padding: '2px',
                                    borderRadius: '3px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    transition: 'all 0.2s ease',
                                    position: 'relative'
                                  }}
                                  title={copiedColor === hex ? 'Copied!' : `Copy ${hex}`}
                                >
                                  {copiedColor === hex ? (
                                    <Check size={12} />
                                  ) : (
                                    <Copy size={12} />
                                  )}
                                </button>
                              </div>
                                );
                              })}
                          </div>
                        )}

                        {/* Description Preview */}
                        {asset.description && asset.description.trim() && !asset.description.includes('Brand colors:') && (
                          <div style={{ marginTop: '8px' }}>
                            <p style={{ 
                              fontSize: '12px', 
                              color: 'var(--text)',
                              margin: 0,
                              lineHeight: '1.4',
                              display: '-webkit-box',
                              WebkitLineClamp: expandedDescriptions.has(asset.id) ? 'none' : 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden'
                            }}>
                              {asset.description}
                            </p>
                            {asset.description.length > 100 && (
                              <button
                                onClick={() => toggleDescriptionExpansion(asset.id)}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: 'var(--primary)',
                                  fontSize: '11px',
                                  cursor: 'pointer',
                                  padding: '4px 0',
                                  textDecoration: 'underline'
                                }}
                              >
                                {expandedDescriptions.has(asset.id) ? 'See less' : 'See more'}
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      {editingAsset === asset.id ? (
                        <button
                          onClick={() => handleEditAsset(asset.id)}
                          style={{
                            color: 'var(--success)',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '4px',
                            borderRadius: '6px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          <svg style={{ width: '16px', height: '16px' }} fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </button>
                      ) : (
                        <button
                          onClick={() => startEdit(asset)}
                          style={{
                            color: 'var(--primary)',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '4px',
                            borderRadius: '6px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          <Edit style={{ width: '16px', height: '16px' }} />
                        </button>
                      )}
                      <button
                        onClick={() => handleCopyAsset(asset)}
                        style={{
                          color: copiedAsset === asset.id ? 'var(--success)' : 'var(--text-light)',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: '4px',
                          borderRadius: '6px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'color 0.2s ease'
                        }}
                        title={copiedAsset === asset.id ? 'Copied!' : 'Copy asset info'}
                      >
                        {copiedAsset === asset.id ? (
                          <Check style={{ width: '16px', height: '16px' }} />
                        ) : (
                          <Copy style={{ width: '16px', height: '16px' }} />
                        )}
                      </button>
                      <button
                        onClick={() => handleDeleteAsset(asset.id)}
                        style={{
                          color: 'var(--error)',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: '4px',
                          borderRadius: '6px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <X style={{ width: '16px', height: '16px' }} />
                      </button>
                    </div>
                  </div>

                  {/* Asset Preview */}
                  <div style={{ 
                    marginBottom: '16px',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    background: 'var(--surface)',
                    border: '1px solid var(--border)'
                  }}>
                    {isImageFile(asset.fileUrl, asset.fileName) ? (
                      <img
                        src={asset.fileUrl}
                        alt={asset.name}
                        style={{
                          width: '100%',
                          height: '120px',
                          objectFit: 'cover',
                          display: 'block'
                        }}
                        onError={(e) => {
                          // Fallback to icon if image fails to load
                          e.currentTarget.style.display = 'none';
                          const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                          if (fallback) {
                            fallback.style.display = 'flex';
                          }
                        }}
                      />
                    ) : isFontFile(asset.fileName) ? (
                      <FontPreviewComponent 
                        fileUrl={asset.fileUrl}
                        fontName={asset.name.replace(/\.[^/.]+$/, "")}
                      />
                    ) : asset.type === 'COLOR_PALETTE' ? (
                      <ColorPalettePreviewComponent 
                        fileUrl={asset.fileUrl}
                        description={asset.description}
                      />
                    ) : null}
                    <div 
                      style={{
                        width: '100%',
                        height: '120px',
                        display: (isImageFile(asset.fileUrl, asset.fileName) || isFontFile(asset.fileName) || asset.type === 'COLOR_PALETTE') ? 'none' : 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'var(--primary-light-bg)',
                        color: 'var(--primary)'
                      }}
                    >
                      {getAssetIcon(asset.type)}
                    </div>
                  </div>

                  {editingAsset === asset.id ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div>
                        <label style={{ 
                          display: 'block', 
                          fontSize: '12px', 
                          fontWeight: '500', 
                          color: 'var(--text)', 
                          marginBottom: '4px' 
                        }}>
                          Type
                        </label>
                        <select
                          value={editForm.type}
                          onChange={(e) => setEditForm({ ...editForm, type: e.target.value as BrandAsset['type'] })}
                          style={{
                            width: '100%',
                            fontSize: '12px',
                            border: '1px solid var(--border)',
                            borderRadius: '6px',
                            padding: '6px 8px',
                            background: 'white',
                            color: 'var(--text)'
                          }}
                        >
                          <option value="LOGO">Logo</option>
                          <option value="FONT">Font</option>
                          <option value="COLOR_PALETTE">Color Palette</option>
                          <option value="GUIDELINES">Brand Guidelines</option>
                          <option value="IMAGE">Image</option>
                          <option value="OTHER">Other</option>
                        </select>
                      </div>
                      <div>
                        <label style={{ 
                          display: 'block', 
                          fontSize: '12px', 
                          fontWeight: '500', 
                          color: 'var(--text)', 
                          marginBottom: '4px' 
                        }}>
                          Description
                        </label>
                        <textarea
                          value={editForm.description}
                          onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                          style={{
                            width: '100%',
                            fontSize: '12px',
                            border: '1px solid var(--border)',
                            borderRadius: '6px',
                            padding: '6px 8px',
                            background: 'white',
                            color: 'var(--text)',
                            resize: 'vertical'
                          }}
                          rows={2}
                          placeholder="Add a description..."
                        />
                      </div>
                      
                      {/* Save Button */}
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'flex-end',
                        marginTop: '12px',
                        paddingTop: '12px',
                        borderTop: '1px solid var(--border)'
                      }}>
                        <button
                          onClick={() => handleEditAsset(asset.id)}
                          style={{
                            padding: '8px 16px',
                            border: 'none',
                            borderRadius: '6px',
                            background: 'var(--primary)',
                            color: 'white',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: '500',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}
                        >
                          <Check style={{ width: '14px', height: '14px' }} />
                          Save Changes
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '8px', 
                        marginBottom: '8px' 
                      }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          padding: '4px 8px',
                          borderRadius: '12px',
                          fontSize: '11px',
                          fontWeight: '500',
                          background: 'var(--primary-light-bg)',
                          color: 'var(--primary)'
                        }}>
                          {asset.type.replace('_', ' ')}
                        </span>
                      </div>
                      {asset.description && (
                        <p style={{ 
                          fontSize: '12px', 
                          color: 'var(--text-light)', 
                          marginBottom: '12px',
                          margin: 0
                        }}>
                          {asset.description}
                        </p>
                      )}
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between' 
                      }}>
                        <span style={{ 
                          fontSize: '11px', 
                          color: 'var(--text-light)' 
                        }}>
                          {new Date(asset.uploadedAt).toLocaleDateString()}
                        </span>
                        <a
                          href={asset.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            color: 'var(--primary)',
                            textDecoration: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '11px',
                            fontWeight: '500'
                          }}
                        >
                          <Download style={{ width: '12px', height: '12px' }} />
                          <span>Download</span>
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {(!brandAssets?.assets || brandAssets.assets.length === 0) && (
            <div style={{ 
              textAlign: 'center', 
              padding: '48px 24px',
              background: 'var(--surface)',
              borderRadius: '12px',
              border: '1px solid var(--border)'
            }}>
              <Folder style={{ 
                width: '48px', 
                height: '48px', 
                color: 'var(--text-light)', 
                margin: '0 auto 16px' 
              }} />
              <h3 style={{ 
                fontSize: '18px', 
                fontWeight: '500', 
                color: 'var(--text)', 
                marginBottom: '8px',
                margin: 0
              }}>
                No brand assets yet
              </h3>
              <p style={{ 
                color: 'var(--text-light)', 
                marginBottom: '16px',
                margin: 0,
                fontSize: '14px'
              }}>
                Upload your logos, fonts, brand guidelines, and other assets to help designers create consistent work for your brand.
              </p>
            </div>
          )}
        </div>
      </div>
    </RoleGuard>
  );
}
