"use client";

import React, { useState, useRef, useCallback } from "react";
import { PdfHighlighter, Tip, Highlight, Popup, PdfLoader } from "react-pdf-highlighter";
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
  const [expandedSections, setExpandedSections] = useState({
    strengths: true,
    gaps: true,
    suggestions: true
  });
  const scrollToFnRef = useRef<any>(null);
  const [isSaving, setIsSaving] = useState(false);

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

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
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

  const aiHighlights: IHighlight[] = [
    ...((analysis?.strengths || []).map((s, i) => isValidHighlightLocation(s.location) ? ({
      id: `strength-${i}`,
      position: {
        boundingRect: {
          x1: s.location.boundingRect?.x1 ?? 0,
          y1: s.location.boundingRect?.y1 ?? 0,
          x2: s.location.boundingRect?.x2 ?? 0,
          y2: s.location.boundingRect?.y2 ?? 0,
          width: s.location.boundingRect?.width ?? 0,
          height: s.location.boundingRect?.height ?? 0,
          pageNumber: s.location.page,
        },
        rects: [],
        pageNumber: s.location.page,
      },
  content: { text: s.chunk || s.text },
      comment: { text: s.explanation, emoji: "" },
    }) : null).filter(Boolean) as IHighlight[]),
    ...((analysis?.gaps || []).map((g, i) => isValidHighlightLocation(g.location) ? ({
      id: `gap-${i}`,
      position: {
        boundingRect: {
          x1: g.location.boundingRect?.x1 ?? 0,
          y1: g.location.boundingRect?.y1 ?? 0,
          x2: g.location.boundingRect?.x2 ?? 0,
          y2: g.location.boundingRect?.y2 ?? 0,
          width: g.location.boundingRect?.width ?? 0,
          height: g.location.boundingRect?.height ?? 0,
          pageNumber: g.location.page,
        },
        rects: [],
        pageNumber: g.location.page,
      },
  content: { text: g.chunk || g.text },
      comment: { text: g.explanation, emoji: "" },
    }) : null).filter(Boolean) as IHighlight[]),
    ...((analysis?.suggestions || []).map((s, i) => s.location && isValidHighlightLocation(s.location) ? ({
      id: `suggestion-${i}`,
      position: {
        boundingRect: {
          x1: s.location.boundingRect?.x1 ?? 0,
          y1: s.location.boundingRect?.y1 ?? 0,
          x2: s.location.boundingRect?.x2 ?? 0,
          y2: s.location.boundingRect?.y2 ?? 0,
          width: s.location.boundingRect?.width ?? 0,
          height: s.location.boundingRect?.height ?? 0,
          pageNumber: s.location.page,
        },
        rects: [],
        pageNumber: s.location.page,
      },
  content: { text: s.chunk || s.text },
      comment: { text: s.category + ' (' + s.priority + ')', emoji: "" },
    }) : null).filter(Boolean) as IHighlight[])
  ];
  const userHighlights: IHighlight[] = notesData
    .filter(note => isValidHighlightLocation(note.highlight_location))
    .map((note) => ({
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
        rects: note.highlight_location.rects || [],
        pageNumber: note.highlight_location.page,
      },
      content: { text: note.note_text },
      comment: { text: note.note_text, emoji: "" },
    }));
  const allHighlights = [...aiHighlights, ...userHighlights];

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
    <PanelGroup direction="horizontal" className="w-full max-w-full min-h-[300px]">
      {/* PDF Viewer Panel */}
      <Panel defaultSize={65} minSize={30} className="bg-gray-100 p-4 flex flex-col max-h-[1000px]">
        <div className="bg-white rounded-lg shadow-lg flex flex-col h-full">
          <ScrollArea className="flex-1">
            <div className="flex justify-center p-4">
              <div style={{ width: "100%", height: 600, position: "absolute" }}>
                <PdfLoader url={pdfUrl} beforeLoad={<PDFViewerLoading />}>
                  {(pdfDocument) => (
                    <div style={{ width: "100%", height: "100%", position: "relative" }}>
                      <div style={{ position: "absolute", width: "100%", height: "100%" }}>
                        <PdfHighlighter
                          ref={pdfHighlighterRef}
                          pdfDocument={pdfDocument}
                          highlights={allHighlights}
                          onSelectionFinished={handleSelectionFinished}
                          highlightTransform={(highlight, index, setTip, hideTip, _, __, isScrolledTo) => {
                            const type = getHighlightType(highlight.id);
                            let className = "";
                            if (type === "note") className = "user-highlight";
                            else if (type === "strength") className = "strength-highlight";
                            else if (type === "gap") className = "gap-highlight";
                            else if (type === "suggestion") className = "suggestion-highlight";
                            // Use both id and index for key to guarantee uniqueness
                            return (
                              <span key={`${highlight.id}-${index}`} className={className}>
                                <Highlight
                                  isScrolledTo={isScrolledTo}
                                  position={highlight.position}
                                  comment={highlight.comment}
                                  onClick={() => setSelectedHighlightId(highlight.id)}
                                />
                              </span>
                            );
                          }}
                          scrollRef={() => {}}
                          onScrollChange={() => {}}
                          pdfScaleValue="auto"
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

      {/* Analysis Panel */}
      <Panel defaultSize={35} minSize={20} className="border-l bg-background flex flex-col">
        <div className="flex-1">
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-4">
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
                          onClick={() => toggleSection('strengths')}
                        >
                          <div className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            <span className="font-medium">Strengths ({analysis.strengths.length})</span>
                          </div>
                          {expandedSections.strengths ?
                            <ChevronUp className="h-4 w-4" /> :
                            <ChevronDown className="h-4 w-4" />
                          }
                        </div>
                        {expandedSections.strengths && (
                          <ul className="space-y-3">
                            {analysis.strengths.map((strength, index) => (
                              <li
                                key={index}
                                className={`border-l-2 border-green-500 pl-3 py-1 cursor-pointer hover:bg-green-50 ${selectedHighlightId === `strength-${index}` ? 'bg-green-100' : ''}`}
                                onClick={() => {
                                  setSelectedHighlightId(`strength-${index}`);
                                  const highlight = allHighlights.find(h => h.id === `strength-${index}`);
                                  if (highlight && scrollToFnRef.current) {
                                    scrollToFnRef.current(highlight);
                                  }
                                }}
                              >
                                <div className="text-sm font-medium text-green-700 break-words">"{strength.text}"</div>
                                <div className="text-xs text-muted-foreground mt-1 break-words">{strength.explanation}</div>
                                {/* highlight location info removed */}
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
                          onClick={() => toggleSection('gaps')}
                        >
                          <div className="flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-yellow-500" />
                            <span className="font-medium">Gaps ({analysis.gaps.length})</span>
                          </div>
                          {expandedSections.gaps ?
                            <ChevronUp className="h-4 w-4" /> :
                            <ChevronDown className="h-4 w-4" />
                          }
                        </div>
                        {expandedSections.gaps && (
                          <ul className="space-y-3">
                            {analysis.gaps.map((gap, index) => (
                              <li
                                key={index}
                                className={`border-l-2 border-yellow-500 pl-3 py-1 cursor-pointer hover:bg-yellow-50 ${selectedHighlightId === `gap-${index}` ? 'bg-yellow-100' : ''}`}
                                onClick={() => {
                                  setSelectedHighlightId(`gap-${index}`);
                                  const highlight = allHighlights.find(h => h.id === `gap-${index}`);
                                  if (highlight && scrollToFnRef.current) {
                                    scrollToFnRef.current(highlight);
                                  }
                                }}
                              >
                                <div className="text-sm font-medium text-yellow-700 break-words">"{gap.text}"</div>
                                <div className="text-xs text-muted-foreground mt-1 break-words">{gap.explanation}</div>
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
                          onClick={() => toggleSection('suggestions')}
                        >
                          <div className="flex items-center gap-2">
                            <MessageSquare className="h-4 w-4 text-blue-500" />
                            <span className="font-medium">Suggestions ({analysis.suggestions.length})</span>
                          </div>
                          {expandedSections.suggestions ?
                            <ChevronUp className="h-4 w-4" /> :
                            <ChevronDown className="h-4 w-4" />
                          }
                        </div>
                        {expandedSections.suggestions && (
                          <ul className="space-y-3">
                            {analysis.suggestions.map((suggestion, index) => (
                              <li
                                key={index}
                                className={`border-l-2 border-blue-500 pl-3 py-1 cursor-pointer hover:bg-blue-50 ${selectedHighlightId === `suggestion-${index}` ? 'bg-blue-100' : ''}`}
                                onClick={() => {
                                  setSelectedHighlightId(`suggestion-${index}`);
                                  const highlight = allHighlights.find(h => h.id === `suggestion-${index}`);
                                  if (highlight && scrollToFnRef.current) {
                                    scrollToFnRef.current(highlight);
                                  }
                                }}
                              >
                                <div className="text-sm font-medium text-blue-700 break-words">"{suggestion.text}"</div>
                                <div className="flex justify-between text-xs mt-1">
                                  <span className="text-blue-600">{suggestion.category}</span>
                                  <span className={`$${
                                    suggestion.priority === 'high' ? 'text-red-600' :
                                    suggestion.priority === 'medium' ? 'text-yellow-600' : 'text-green-600'
                                  }`}>
                                    {suggestion.priority} priority
                                  </span>
                                </div>
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