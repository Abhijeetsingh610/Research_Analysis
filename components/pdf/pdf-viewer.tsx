"use client";

import { useState, useCallback } from "react";
import PDFJSViewer from "@/components/pdf/pdfjs-viewer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { MessageSquare, Lightbulb, AlertTriangle, CheckCircle, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import type { Analysis, Note } from "@/lib/types";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";

interface PDFViewerProps {
  paperId: string
  pdfUrl: string
  analysis?: Analysis
  notes: Note[]
}

export default function PDFViewer({ paperId, pdfUrl, analysis, notes }: PDFViewerProps) {
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

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  return (
    <PanelGroup direction="horizontal" className="w-full max-w-full min-h-[300px]">
      {/* PDF Viewer Panel */}
      <Panel defaultSize={65} minSize={30} className="bg-gray-100 p-4 flex flex-col max-h-[1000px]">
        <div className="bg-white rounded-lg shadow-lg flex flex-col h-full">
          <ScrollArea className="flex-1">
            <div className="flex justify-center p-4">
              <PDFJSViewer url={pdfUrl} />
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
                              <li key={index} className="border-l-2 border-green-500 pl-3 py-1">
                                <div className="text-sm font-medium text-green-700 break-words">"{strength.text}"</div>
                                <div className="text-xs text-muted-foreground mt-1 break-words">{strength.explanation}</div>
                                <div className="text-xs text-green-600 mt-1">
                                  Page {strength.location.page}, Position {strength.location.textSpan.start}-{strength.location.textSpan.end}
                                </div>
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
                              <li key={index} className="border-l-2 border-yellow-500 pl-3 py-1">
                                <div className="text-sm font-medium text-yellow-700 break-words">"{gap.text}"</div>
                                <div className="text-xs text-muted-foreground mt-1 break-words">{gap.explanation}</div>
                                <div className="text-xs text-yellow-600 mt-1">
                                  Page {gap.location.page}, Position {gap.location.textSpan.start}-{gap.location.textSpan.end}
                                </div>
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
                              <li key={index} className="border-l-2 border-blue-500 pl-3 py-1">
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
                    Notes ({notes.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {notes.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No notes yet</p>
                  ) : (
                    <div className="space-y-2">
                      {notes.map((note) => (
                        <div
                          key={note.id}
                          className="p-3 border rounded-lg cursor-pointer hover:bg-muted/50"
                          onClick={() => setSelectedNote(note)}
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
                    <p className="text-sm break-words">{selectedNote.note_text}</p>
                    <Separator />
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-muted-foreground">
                        Created: {new Date(selectedNote.created_at).toLocaleDateString()}
                      </span>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => deleteNoteMutation.mutate({ id: selectedNote.id })}
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