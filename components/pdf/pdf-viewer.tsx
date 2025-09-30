"use client";

import React, { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { PdfHighlighter, Tip, Highlight, PdfLoader } from "react-pdf-highlighter";
import type { IHighlight, ScaledPosition } from "react-pdf-highlighter";
import "react-pdf-highlighter/dist/style.css";
import "./pdf-highlighter-colors.css";
import type { HighlightLocation } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { MessageSquare, Lightbulb, AlertTriangle, CheckCircle, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import type { Analysis, Note } from "@/lib/types";
import { PDFViewerLoading } from "./pdf-viewer-loading";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";

// ✅ Suppress React 19 onUpdate error from react-pdf-highlighter (library compatibility issue)
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  const originalError = console.error;
  console.error = (...args: any[]) => {
    if (typeof args[0] === 'string' && args[0].includes('Unknown event handler property `onUpdate`')) {
      // Suppress this specific error - it's a known react-pdf-highlighter + React 19 compatibility issue
      return;
    }
    originalError.apply(console, args);
  };
}

interface PDFViewerProps {
  paperId: string
  pdfUrl: string
  analysis?: Analysis
  notes: Note[]
}

export default function PDFViewer({ paperId, pdfUrl, analysis, notes }: PDFViewerProps) {
  const [selectedHighlightId, setSelectedHighlightId] = useState<string | null>(null);
  const pdfHighlighterRef = useRef<any>(null);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  console.log("PDFViewer received analysis:", analysis)
  console.log("Analysis strengths:", analysis?.strengths)
  console.log("Analysis gaps:", analysis?.gaps)
  console.log("Analysis suggestions:", analysis?.suggestions)
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [expandedSection, setExpandedSection] = useState<'strengths' | 'gaps' | 'suggestions'>('strengths');
  const scrollViewerTo = useRef<((highlight: IHighlight) => void) | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const hasScrolledToFirstHighlight = useRef(false);
  // 🔥 CRITICAL FIX: Store current highlights in ref so scrollToHighlightFromHash can access latest value
  const allHighlightsRef = useRef<IHighlight[]>([]);

  // Debug analysis data
  console.log("=== PDF VIEWER DEBUG ===")
  console.log("Analysis received:", analysis)
  if (analysis) {
    console.log("Strengths count:", analysis.strengths?.length || 0)
    analysis.strengths?.forEach((s, i) => {
      console.log(`Strength ${i}:`, {
        hasLocation: !!s.location,
        hasBoundingRect: !!s.location?.boundingRect,
        boundingRect: s.location?.boundingRect,
        chunk: s.chunk?.substring(0, 50)
      })
    })
    console.log("Gaps count:", analysis.gaps?.length || 0)
    analysis.gaps?.forEach((g, i) => {
      console.log(`Gap ${i}:`, {
        hasLocation: !!g.location,
        hasBoundingRect: !!g.location?.boundingRect,
        boundingRect: g.location?.boundingRect,
        chunk: g.chunk?.substring(0, 50)
      })
    })
    console.log("Suggestions count:", analysis.suggestions?.length || 0)
    analysis.suggestions?.forEach((s, i) => {
      console.log(`Suggestion ${i}:`, {
        hasLocation: !!s.location,
        hasBoundingRect: !!s.location?.boundingRect,
        boundingRect: s.location?.boundingRect,
        chunk: s.chunk?.substring(0, 50)
      })
    })
  }

  const utils = trpc.useUtils();

  const deleteNoteMutation = trpc.notes.delete.useMutation({
    onSuccess: () => {
      utils.notes.list.invalidate({ paperId });
      utils.papers.getById.invalidate({ id: paperId });
      setSelectedNote(null);
    },
    onError: (error) => {
      console.error("[v0] Failed to delete note:", error);
    },
  });

  const addNoteMutation = trpc.notes.create.useMutation({
    onSuccess: () => {
      utils.notes.list.invalidate({ paperId });
      utils.papers.getById.invalidate({ id: paperId });
    },
    onError: (error) => {
      alert("Failed to add note: " + error.message);
    },
  });

  const notesQuery = trpc.notes.list.useQuery({ paperId });
  const notesData = notesQuery.data || [];

  const createNote = useCallback(async (position: ScaledPosition, content: { text?: string }, comment: { text: string; emoji: string }, hideTip?: () => void) => {
    setIsSaving(true);
    try {
      await addNoteMutation.mutateAsync({
        paper_id: paperId,
        note_text: comment.text,
        selected_text: content.text,
        highlight_location: {
          page: position.pageNumber,
          textSpan: {
            start: 0,
            end: content.text?.length ?? 0,
          },
          boundingRect: {
            x1: position.boundingRect.x1,
            y1: position.boundingRect.y1,
            x2: position.boundingRect.x2,
            y2: position.boundingRect.y2,
            width: position.boundingRect.x2 - position.boundingRect.x1,
            height: position.boundingRect.y2 - position.boundingRect.y1,
          },
          rects: position.rects,
        },
      });
      if (hideTip) hideTip();
    } catch (error) {
      console.error("Failed to create note:", error);
    } finally {
      setIsSaving(false);
    }
  }, [paperId, addNoteMutation]);

  const handleSectionToggle = (section: 'strengths' | 'gaps' | 'suggestions') => {
    setExpandedSection(prev => (prev === section ? null : section));
  };

  // Map AI and user highlights to IHighlight[]
  function getHighlightType(id: string | undefined) {
    if (!id) return "other";
    if (id.startsWith("note-")) return "note";
    if (id.startsWith("strength-")) return "strength";
    if (id.startsWith("gap-")) return "gap";
    if (id.startsWith("suggestion-")) return "suggestion";
    return "other";
  }

  // Helper to check if a highlight location is valid
  function isValidHighlightLocation(loc: any) {
    return (
      loc &&
      typeof loc.page === "number" &&
      loc.page > 0 &&
      loc.boundingRect &&
      Object.values(loc.boundingRect).every(v => typeof v === "number" && !isNaN(v))
    );
  }

  // Helper to validate and filter rects array
  function validateRects(rects: any[]): any[] {
    if (!rects || !Array.isArray(rects)) return [];
    
    return rects.filter(rect => {
      // Check all coordinate values are valid finite numbers
      // Note: width/height are VIEWPORT dimensions (page width/height), not rect dimensions
      const isValid = rect &&
        typeof rect.x1 === 'number' && isFinite(rect.x1) &&
        typeof rect.y1 === 'number' && isFinite(rect.y1) &&
        typeof rect.x2 === 'number' && isFinite(rect.x2) &&
        typeof rect.y2 === 'number' && isFinite(rect.y2) &&
        rect.x2 > rect.x1 && // Ensure rect has positive dimensions
        rect.y2 > rect.y1 &&
        typeof rect.width === 'number' && isFinite(rect.width) && rect.width > 0 &&
        typeof rect.height === 'number' && isFinite(rect.height) && rect.height > 0;
      
      if (!isValid) {
        console.warn('Invalid rect filtered out:', rect);
      }
      return isValid;
    });
  }

  const aiHighlights: IHighlight[] = useMemo(() => [
    ...((analysis?.strengths || []).map((s, i) => {
      const isValid = isValidHighlightLocation(s.location);
      console.log(`Strength ${i} highlight valid:`, isValid, s.location);
      if (!isValid) return null;
      
      // Use rects from location if available, otherwise create from boundingRect
      const boundingRect = s.location.boundingRect;
      let rects = s.location.rects && s.location.rects.length > 0 
        ? s.location.rects 
        : [{
            x1: boundingRect.x1,
            y1: boundingRect.y1,
            x2: boundingRect.x2,
            y2: boundingRect.y2,
            width: boundingRect.width,
            height: boundingRect.height,
            pageNumber: s.location.page,
          }];
      
      // Validate and filter rects
      rects = validateRects(rects);
      if (rects.length === 0) {
        console.warn(`Strength ${i}: No valid rects after validation`);
        return null;
      }
      
      console.log(`Strength ${i} valid rects:`, rects);
      
      return {
        id: `strength-${i}`,
        position: {
          boundingRect: {
            x1: boundingRect.x1,
            y1: boundingRect.y1,
            x2: boundingRect.x2,
            y2: boundingRect.y2,
            width: boundingRect.width,
            height: boundingRect.height,
            pageNumber: s.location.page,
          },
          rects: rects,
          pageNumber: s.location.page,
        },
        content: { text: s.chunk || s.text },
        comment: { text: s.explanation, emoji: "" },
      }
    }).filter(Boolean) as IHighlight[]),
    ...((analysis?.gaps || []).map((g, i) => {
      const isValid = isValidHighlightLocation(g.location);
      if (!isValid) return null;
      
      // Use rects from location if available
      const boundingRect = g.location.boundingRect;
      let rects = g.location.rects && g.location.rects.length > 0 
        ? g.location.rects 
        : [{
            x1: boundingRect.x1,
            y1: boundingRect.y1,
            x2: boundingRect.x2,
            y2: boundingRect.y2,
            width: boundingRect.width,
            height: boundingRect.height,
            pageNumber: g.location.page,
          }];
      
      // Validate and filter rects
      rects = validateRects(rects);
      if (rects.length === 0) {
        console.warn(`Gap ${i}: No valid rects after validation`);
        return null;
      }
      
      return {
        id: `gap-${i}`,
        position: {
          boundingRect: {
            x1: boundingRect.x1,
            y1: boundingRect.y1,
            x2: boundingRect.x2,
            y2: boundingRect.y2,
            width: boundingRect.width,
            height: boundingRect.height,
            pageNumber: g.location.page,
          },
          rects: rects,
          pageNumber: g.location.page,
        },
        content: { text: g.chunk || g.text },
        comment: { text: g.explanation, emoji: "" },
      }
    }).filter(Boolean) as IHighlight[]),
    ...((analysis?.suggestions || []).map((s, i) => {
      const isValid = s.location && isValidHighlightLocation(s.location);
      if (!isValid) return null;
      
      // Use rects from location if available
      const boundingRect = s.location.boundingRect;
      let rects = s.location.rects && s.location.rects.length > 0 
        ? s.location.rects 
        : [{
            x1: boundingRect.x1,
            y1: boundingRect.y1,
            x2: boundingRect.x2,
            y2: boundingRect.y2,
            width: boundingRect.width,
            height: boundingRect.height,
            pageNumber: s.location.page,
          }];
      
      // Validate and filter rects
      rects = validateRects(rects);
      if (rects.length === 0) {
        console.warn(`Suggestion ${i}: No valid rects after validation`);
        return null;
      }
      
      return {
        id: `suggestion-${i}`,
        position: {
          boundingRect: {
            x1: boundingRect.x1,
            y1: boundingRect.y1,
            x2: boundingRect.x2,
            y2: boundingRect.y2,
            width: boundingRect.width,
            height: boundingRect.height,
            pageNumber: s.location.page,
          },
          rects: rects,
          pageNumber: s.location.page,
        },
        content: { text: s.chunk || s.text },
        comment: { text: s.category + ' (' + s.priority + ')', emoji: "" },
      }
    }).filter(Boolean) as IHighlight[])
  ], [analysis]);
  
  const userHighlights: IHighlight[] = useMemo(() => notesData
    .filter(note => isValidHighlightLocation(note.highlight_location))
    .map((note) => {
      // Validate rects for user notes
      const validatedRects = validateRects(note.highlight_location.rects || []);
      if (validatedRects.length === 0) {
        console.warn(`User note ${note.id}: No valid rects`);
        return null;
      }
      
      return {
        id: `note-${note.id}`,
        position: {
          boundingRect: {
            x1: note.highlight_location.boundingRect?.x1 ?? 0,
            y1: note.highlight_location.boundingRect?.y1 ?? 0,
            x2: note.highlight_location.boundingRect?.x2 ?? 0,
            y2: note.highlight_location.boundingRect?.y2 ?? 0,
            width: note.highlight_location.boundingRect?.width ?? 0,
            height: note.highlight_location.boundingRect?.height ?? 0,
            pageNumber: note.highlight_location.page,
          },
          rects: validatedRects,
          pageNumber: note.highlight_location.page,
        },
        content: { text: note.note_text },
        comment: { text: note.note_text, emoji: "" },
      };
    })
    .filter(Boolean) as IHighlight[], [notesData]);
    
  const allHighlights = useMemo(() => [...aiHighlights, ...userHighlights], [aiHighlights, userHighlights]);
  console.log(`Total highlights: ${allHighlights.length} (AI: ${aiHighlights.length}, User: ${userHighlights.length})`);
  
  // 🔥 CRITICAL FIX: Keep ref updated with latest highlights for scroll function
  useEffect(() => {
    allHighlightsRef.current = allHighlights;
    console.log(`📌 Updated allHighlightsRef with ${allHighlights.length} highlights`);
  }, [allHighlights]);
  
  // Debug first highlight to verify rects
  if (aiHighlights.length > 0) {
    console.log("First AI highlight sample:", {
      id: aiHighlights[0].id,
      hasRects: !!aiHighlights[0].position?.rects,
      rectsCount: aiHighlights[0].position?.rects?.length || 0,
      rects: aiHighlights[0].position?.rects,
      boundingRect: aiHighlights[0].position?.boundingRect,
      pageNumber: aiHighlights[0].position?.pageNumber
    });
    console.log("Full first highlight:", JSON.stringify(aiHighlights[0], null, 2));
  }
  
  // Log all AI highlights for debugging
  console.log("All AI highlights:", aiHighlights.map(h => ({
    id: h.id,
    page: h.position?.pageNumber,
    hasRects: !!h.position?.rects,
    rectsCount: h.position?.rects?.length || 0
  })));

  // 🔥 FIXED: Parse hash to get highlight ID (following reference implementation)
  const parseIdFromHash = () => {
    return document.location.hash.slice("#highlight-".length);
  };

  // 🔥 FIXED: Reset hash (clears selection)
  const resetHash = () => {
    document.location.hash = "";
  };

  // 🔥 FIXED: Get highlight by ID using ref (always gets latest highlights)
  const getHighlightById = (id: string): IHighlight | null => {
    return allHighlightsRef.current.find(h => h.id === id) || null;
  };

  // 🔥 FIXED: Scroll to highlight from hash (following reference implementation exactly)
  // CRITICAL: Empty dependency array + ref access = stable callback that sees latest data
  const scrollToHighlightFromHash = useCallback(() => {
    const highlightId = parseIdFromHash();
    if (!highlightId) return;

    console.log(`🎯 scrollToHighlightFromHash: ${highlightId}`);
    console.log(`📋 Available highlights:`, allHighlightsRef.current.map(h => h.id));
    
    const highlight = getHighlightById(highlightId);
    if (!highlight) {
      console.warn(`⚠️ Highlight not found: ${highlightId}`);
      console.warn(`📋 Searched in ${allHighlightsRef.current.length} highlights`);
      return;
    }

    console.log(`✅ Found highlight:`, {
      id: highlight.id,
      page: highlight.position?.pageNumber,
      hasPosition: !!highlight.position,
      hasBoundingRect: !!highlight.position?.boundingRect
    });

    // Update UI selection
    setSelectedHighlightId(highlightId);

    // Use library's scroll function (primary method)
    if (scrollViewerTo.current) {
      try {
        console.log(`📜 Calling scrollViewerTo for ${highlightId}`, {
          page: highlight.position?.pageNumber,
          boundingRect: highlight.position?.boundingRect,
          hasRects: !!highlight.position?.rects,
          rectsCount: highlight.position?.rects?.length
        });
        scrollViewerTo.current(highlight);
        console.log(`✅ ScrollViewerTo called successfully`);
        
        // 🔥 FALLBACK: Direct DOM scroll after a short delay to ensure it worked
        setTimeout(() => {
          const pageNumber = highlight.position?.pageNumber;
          if (pageNumber) {
            // Try to find the page element and scroll to it
            const pageElement = document.querySelector(`[data-page-number="${pageNumber}"]`);
            if (pageElement) {
              console.log(`🎯 Fallback: Found page element ${pageNumber}, scrolling...`);
              pageElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
            } else {
              console.warn(`⚠️ Fallback: Page element ${pageNumber} not found in DOM`);
              // Try alternative selector
              const altPageElement = document.querySelector(`.react-pdf__Page[data-page-number="${pageNumber}"]`);
              if (altPageElement) {
                console.log(`🎯 Fallback: Found page via alt selector, scrolling...`);
                altPageElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }
            }
          }
        }, 100);
      } catch (error) {
        console.error(`❌ Scroll error:`, error);
      }
    } else {
      console.error(`❌ scrollViewerTo.current is not available`);
    }
  }, []); // EMPTY DEPENDENCIES - matches reference implementation!

  // 🔥 NEW: Update hash when clicking analysis items (following reference implementation)
  const updateHash = useCallback((highlight: IHighlight) => {
    console.log(`🔗 Updating hash to: highlight-${highlight.id}`);
    window.location.hash = `highlight-${highlight.id}`;
  }, []);

  // 🔥 NEW: Listen to hash changes for navigation (following reference implementation)
  useEffect(() => {
    const handleHashChange = () => {
      console.log(`🔄 Hash changed: ${window.location.hash}`);
      scrollToHighlightFromHash();
    };

    window.addEventListener("hashchange", handleHashChange, false);
    
    return () => {
      window.removeEventListener("hashchange", handleHashChange, false);
    };
  }, [scrollToHighlightFromHash]);

  // ✅ Auto-scroll to first highlight when analysis loads
  useEffect(() => {
    if (analysis && aiHighlights.length > 0 && !hasScrolledToFirstHighlight.current && scrollViewerTo.current) {
      console.log("🎯 Auto-scroll: Preparing to scroll to first highlight...");
      console.log("First highlight:", aiHighlights[0]);
      
      // Wait for PDF to fully render
      const timeoutId = setTimeout(() => {
        if (aiHighlights.length > 0) {
          const firstHighlight = aiHighlights[0];
          console.log("🎯 Auto-scrolling to first highlight:", firstHighlight.id);
          updateHash(firstHighlight); // Use hash-based navigation
          hasScrolledToFirstHighlight.current = true;
          console.log("✅ Auto-scroll completed");
        }
      }, 2000); // 2 seconds to ensure PDF is fully loaded
      
      return () => clearTimeout(timeoutId);
    }
  }, [analysis, aiHighlights, updateHash]);

  // Reset scroll flag when paper changes
  useEffect(() => {
    console.log("📄 Paper changed, resetting scroll flag");
    hasScrolledToFirstHighlight.current = false;
  }, [paperId]);
  
  // 🔥 FORCE HIGHLIGHT VISIBILITY: Trigger re-render when highlights are ready
  useEffect(() => {
    if (aiHighlights.length > 0) {
      console.log(`✨ ${aiHighlights.length} highlights ready for rendering`);
      // Force a micro-update to ensure highlights are painted
      const timer = setTimeout(() => {
        console.log(`🎨 Forcing highlight visibility update`);
        setSelectedHighlightId(prev => prev); // Trigger re-render without changing state
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [aiHighlights.length]);

  const handleSelectionFinished = (position: ScaledPosition, content: { text?: string }, hideTip: () => void, transformSelection: () => void) => {
    return (
      <Tip
        onOpen={transformSelection}
        onConfirm={(comment: { text: string; emoji: string }) => {
          createNote(position, content, comment, hideTip);
        }}
        isSaving={isSaving}
      />
    );
  };

  // Delete note instantly from UI
  const handleDeleteNote = async (id: string) => {
    setSelectedNote(null);
    deleteNoteMutation.mutate({ id });
  };

  return (
    <PanelGroup direction="horizontal" className="w-full h-[calc(100vh-8rem)]">
      {/* PDF Viewer Panel - Responsive */}
      <Panel defaultSize={65} minSize={30} className="bg-gray-100 p-2 md:p-4 flex flex-col">
        <div className="bg-white rounded-lg shadow-lg flex flex-col h-full">
          <ScrollArea className="flex-1">
            <div className="flex justify-center p-2 md:p-4">
              <div className="w-full h-[calc(100vh-12rem)] relative">
                <PdfLoader url={pdfUrl} beforeLoad={<PDFViewerLoading />}>
                  {(pdfDocument) => (
                    <div className="w-full h-full relative">
                      <div className="absolute inset-0">
                        <PdfHighlighter
                          key={`pdf-highlighter-${allHighlights.length}`}
                          ref={pdfHighlighterRef}
                          pdfDocument={pdfDocument}
                          highlights={allHighlights}
                          onSelectionFinished={handleSelectionFinished}
                          onScrollChange={resetHash}
                          highlightTransform={(highlight, index, setTip, hideTip, _, __, isScrolledTo) => {
                            const type = getHighlightType(highlight.id);
                            
                            // Debug logging for first few highlights
                            if (index < 3) {
                              console.log(`🎨 Rendering highlight ${highlight.id}:`, {
                                type,
                                page: highlight.position?.pageNumber,
                                hasRects: !!highlight.position?.rects,
                                rectsCount: highlight.position?.rects?.length || 0,
                                isScrolledTo
                              });
                            }
                            
                            // 🔥 Enhanced styles for better visibility
                            let style: React.CSSProperties = {
                              opacity: 1,
                              pointerEvents: 'auto',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease'
                            };
                            
                            if (type === "gap") {
                              style.background = "rgba(255, 226, 104, 0.5)"; // Brighter yellow for gaps
                              style.border = "1px solid rgba(255, 200, 50, 0.6)";
                            } else if (type === "strength") {
                              style.background = "rgba(180, 220, 255, 0.4)"; // Light blue for strengths
                              style.border = "1px solid rgba(100, 180, 255, 0.5)";
                            } else if (type === "suggestion") {
                              style.background = "rgba(200, 200, 200, 0.4)"; // Gray for suggestions
                              style.border = "1px solid rgba(150, 150, 150, 0.5)";
                            } else if (type === "note") {
                              style.background = "rgba(255, 226, 104, 0.5)"; // Yellow for user notes
                              style.border = "1px solid rgba(255, 200, 50, 0.6)";
                            }
                            
                            // Highlight selected item
                            if (selectedHighlightId === highlight.id) {
                              style.background = style.background?.replace('0.4', '0.7').replace('0.5', '0.8');
                              style.border = style.border?.replace('0.5', '1.0').replace('0.6', '1.0');
                              style.boxShadow = '0 0 8px rgba(0, 0, 0, 0.3)';
                            }
                            
                            return (
                              <div 
                                key={`highlight-${highlight.id}`}
                                style={style}
                                className="pdf-highlight-item"
                                onClick={() => {
                                  console.log(`🖱️ Clicked highlight: ${highlight.id}`);
                                  setSelectedHighlightId(highlight.id);
                                }}
                              >
                                <Highlight
                                  isScrolledTo={isScrolledTo}
                                  position={highlight.position}
                                  comment={highlight.comment}
                                />
                              </div>
                            );
                          }}
                          scrollRef={(scrollTo) => {
                            console.log("📌 scrollRef callback received");
                            scrollViewerTo.current = scrollTo;
                            // Immediately try to scroll if there's a hash (following reference pattern)
                            scrollToHighlightFromHash();
                          }}
                          enableAreaSelection={() => false}
                        />
                      </div>
                    </div>
                  )}
                </PdfLoader>
              </div>
            </div>
          </ScrollArea>
        </div>
      </Panel>

      <PanelResizeHandle className="w-2 bg-border hover:bg-accent transition-colors" />

      {/* Analysis Panel - Responsive */}
      <Panel defaultSize={35} minSize={20} className="border-l bg-background flex flex-col">
        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-2 md:p-4 space-y-4">
              {/* Analysis Section */}
              {analysis && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Lightbulb className="h-4 w-4" />
                      Analysis Results
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Strengths Section */}
                    {analysis.strengths && analysis.strengths.length > 0 && (
                      <div>
                        <div
                          className="flex items-center justify-between cursor-pointer mb-2"
                          onClick={() => handleSectionToggle('strengths')}
                        >
                          <div className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            <span className="font-medium">Strengths ({analysis.strengths.length})</span>
                          </div>
                          {expandedSection === 'strengths' ?
                            <ChevronUp className="h-4 w-4" /> :
                            <ChevronDown className="h-4 w-4" />
                          }
                        </div>
                        {expandedSection === 'strengths' && (
                          <ul className="space-y-3">
                            {analysis.strengths.map((strength, index) => (
                              <li
                                key={index}
                                className={`border-l-2 border-green-500 pl-3 py-1 cursor-pointer hover:bg-green-50 transition-colors ${selectedHighlightId === `strength-${index}` ? 'bg-green-100' : ''}`}
                                onClick={() => {
                                  console.log(`🖱️ CLICKED STRENGTH #${index}`);
                                  const highlight = allHighlights.find(h => h.id === `strength-${index}`);
                                  if (highlight) {
                                    updateHash(highlight); // Use hash-based navigation
                                  }
                                }}
                              >
                                <div className="text-sm font-medium text-green-700 break-words">"{strength.text}"</div>
                                <div className="text-xs text-muted-foreground mt-1 break-words">{strength.explanation}</div>
                                {strength.chunk && (
                                  <div className="mt-2 p-2 bg-green-50 rounded text-xs text-gray-700 border border-green-200">
                                    <div className="font-semibold text-green-800 mb-1">PDF Text:</div>
                                    <div className="italic">"{strength.chunk.substring(0, 150)}{strength.chunk.length > 150 ? '...' : ''}"</div>
                                  </div>
                                )}
                                {!strength.location?.boundingRect && (
                                  <div className="mt-1 text-xs text-red-500">⚠️ No highlight location</div>
                                )}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}

                    {/* Gaps Section */}
                    {analysis.gaps && analysis.gaps.length > 0 && (
                      <div>
                        <div
                          className="flex items-center justify-between cursor-pointer mb-2"
                          onClick={() => handleSectionToggle('gaps')}
                        >
                          <div className="flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-yellow-500" />
                            <span className="font-medium">Gaps ({analysis.gaps.length})</span>
                          </div>
                          {expandedSection === 'gaps' ?
                            <ChevronUp className="h-4 w-4" /> :
                            <ChevronDown className="h-4 w-4" />
                          }
                        </div>
                        {expandedSection === 'gaps' && (
                          <ul className="space-y-3">
                            {analysis.gaps.map((gap, index) => (
                              <li
                                key={index}
                                className={`border-l-2 border-yellow-500 pl-3 py-1 cursor-pointer hover:bg-yellow-50 transition-colors ${selectedHighlightId === `gap-${index}` ? 'bg-yellow-100' : ''}`}
                                onClick={() => {
                                  console.log(`🖱️ CLICKED GAP #${index}`);
                                  const highlight = allHighlights.find(h => h.id === `gap-${index}`);
                                  if (highlight) {
                                    updateHash(highlight); // Use hash-based navigation
                                  }
                                }}
                              >
                                <div className="text-sm font-medium text-yellow-700 break-words">"{gap.text}"</div>
                                <div className="text-xs text-muted-foreground mt-1 break-words">{gap.explanation}</div>
                                {gap.chunk && (
                                  <div className="mt-2 p-2 bg-yellow-50 rounded text-xs text-gray-700 border border-yellow-200">
                                    <div className="font-semibold text-yellow-800 mb-1">PDF Text:</div>
                                    <div className="italic">"{gap.chunk.substring(0, 150)}{gap.chunk.length > 150 ? '...' : ''}"</div>
                                  </div>
                                )}
                                {!gap.location?.boundingRect && (
                                  <div className="mt-1 text-xs text-red-500">⚠️ No highlight location</div>
                                )}
                                {gap.exaContext && gap.exaContext.length > 0 && (
                                  <div className="mt-2 pl-2 border-l-2 border-gray-200">
                                    <div className="text-xs font-semibold text-gray-500 mb-1">Reference Context:</div>
                                    <ul className="space-y-1">
                                      {gap.exaContext.map((ref, refIdx) => (
                                        <li key={refIdx} className="text-xs">
                                          <a
                                            href={ref.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-blue-600 hover:underline"
                                          >
                                            {ref.title || ref.url}
                                          </a>
                                          {ref.snippet && (
                                            <div className="text-gray-600 mt-0.5">{ref.snippet}</div>
                                          )}
                                          {ref.publishedAt && (
                                            <div className="text-gray-400">{new Date(ref.publishedAt).toLocaleDateString()}</div>
                                          )}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}

                    {/* Suggestions Section */}
                    {analysis.suggestions && analysis.suggestions.length > 0 && (
                      <div>
                        <div
                          className="flex items-center justify-between cursor-pointer mb-2"
                          onClick={() => handleSectionToggle('suggestions')}
                        >
                          <div className="flex items-center gap-2">
                            <MessageSquare className="h-4 w-4 text-blue-500" />
                            <span className="font-medium">Suggestions ({analysis.suggestions.length})</span>
                          </div>
                          {expandedSection === 'suggestions' ?
                            <ChevronUp className="h-4 w-4" /> :
                            <ChevronDown className="h-4 w-4" />
                          }
                        </div>
                        {expandedSection === 'suggestions' && (
                          <ul className="space-y-3">
                            {analysis.suggestions.map((suggestion, index) => (
                              <li
                                key={index}
                                className={`border-l-2 border-blue-500 pl-3 py-1 cursor-pointer hover:bg-blue-50 transition-colors ${selectedHighlightId === `suggestion-${index}` ? 'bg-blue-100' : ''}`}
                                onClick={() => {
                                  console.log(`🖱️ CLICKED SUGGESTION #${index}`);
                                  const highlight = allHighlights.find(h => h.id === `suggestion-${index}`);
                                  if (highlight) {
                                    updateHash(highlight); // Use hash-based navigation
                                  }
                                }}
                              >
                                <div className="text-sm font-medium text-blue-700 break-words">"{suggestion.text}"</div>
                                <div className="flex justify-between text-xs mt-1">
                                  <span className="text-blue-600">{suggestion.category}</span>
                                  <span className={`${
                                    suggestion.priority === 'high' ? 'text-red-600' :
                                    suggestion.priority === 'medium' ? 'text-yellow-600' : 'text-green-600'
                                  }`}>
                                    {suggestion.priority} priority
                                  </span>
                                </div>
                                {suggestion.chunk && (
                                  <div className="mt-2 p-2 bg-blue-50 rounded text-xs text-gray-700 border border-blue-200">
                                    <div className="font-semibold text-blue-800 mb-1">PDF Text:</div>
                                    <div className="italic">"{suggestion.chunk.substring(0, 150)}{suggestion.chunk.length > 150 ? '...' : ''}"</div>
                                  </div>
                                )}
                                {!suggestion.location?.boundingRect && (
                                  <div className="mt-1 text-xs text-red-500">⚠️ No highlight location</div>
                                )}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Notes Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Notes ({notesData.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {notesData.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No notes yet</p>
                  ) : (
                    <div className="space-y-2">
                      {notesData.map((note) => (
                        <div
                          key={note.id}
                          className="p-3 border rounded-lg cursor-pointer hover:bg-muted/50"
                          onClick={() => {
                            setSelectedNote(note);
                            setSelectedHighlightId(`note-${note.id}`);
                            const highlight = allHighlights.find(h => h.id === `note-${note.id}`);
                            if (highlight && scrollToFnRef.current) {
                              scrollToFnRef.current(highlight);
                            }
                          }}
                        >
                          <p className="text-sm break-words">{note.note_text}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(note.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Selected Note Details */}
              {selectedNote && (
                <Card>
                  <CardHeader>
                    <CardTitle>Note Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {selectedNote.selected_text && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Selected Text:</p>
                        <p className="text-sm break-words bg-muted p-2 rounded">{selectedNote.selected_text}</p>
                        <Separator className="my-2" />
                      </div>
                    )}
                    <p className="text-sm break-words">{selectedNote.note_text}</p>
                    <Separator />
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-muted-foreground">
                        Created: {new Date(selectedNote.created_at).toLocaleDateString()}
                      </span>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          handleDeleteNote(selectedNote.id);
                          setSelectedNote(null);
                        }}
                        disabled={deleteNoteMutation.isPending}
                      >
                        Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </ScrollArea>
        </div>
      </Panel>
    </PanelGroup>
  );
}