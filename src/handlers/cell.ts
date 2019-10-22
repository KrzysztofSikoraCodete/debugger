// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { CodeCell } from '@jupyterlab/cells';

import { CodeMirrorEditor } from '@jupyterlab/codemirror';

import { Editor, Doc } from 'codemirror';

import { Breakpoints, SessionTypes } from '../breakpoints';
import { Debugger } from '../debugger';
import { IDisposable } from '@phosphor/disposable';
import { Signal } from '@phosphor/signaling';

export class CellManager implements IDisposable {
  constructor(options: CellManager.IOptions) {
    this._debuggerModel = options.debuggerModel;
    this.breakpointsModel = options.breakpointsModel;
    this.activeCell = options.activeCell;
    this._type = options.type;
    this.onActiveCellChanged();

    this.breakpointsModel.clearedBreakpoints.connect((_, type) => {
      if (type !== this._type) {
        return;
      }
      this.clearGutter(this.activeCell);
    });
  }

  private _previousCell: CodeCell;
  private previousLineCount: number;
  private _debuggerModel: Debugger.Model;
  private _type: SessionTypes;
  private breakpointsModel: Breakpoints.Model;
  private _activeCell: CodeCell;
  isDisposed: boolean;

  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    if (this.previousCell) {
      this.removeListener(this.previousCell);
    }
    this.removeListener(this.activeCell);
    Signal.clearData(this);
  }

  set previousCell(cell: CodeCell) {
    this._previousCell = cell;
  }

  get previousCell() {
    return this._previousCell;
  }

  set activeCell(cell: CodeCell) {
    if (cell) {
      this._activeCell = cell;
      this._debuggerModel.codeValue = cell.model.value;
      this.onActiveCellChanged();
    }
  }

  get activeCell(): CodeCell {
    return this._activeCell;
  }

  protected clearGutter(cell: CodeCell) {
    const editor = cell.editor as CodeMirrorEditor;
    editor.doc.eachLine(line => {
      if ((line as ILineInfo).gutterMarkers) {
        editor.editor.setGutterMarker(line, 'breakpoints', null);
      }
    });
  }

  onActiveCellChanged() {
    if (
      this.activeCell &&
      this.activeCell.isAttached &&
      this.activeCell.editor &&
      this._debuggerModel &&
      this._debuggerModel.session
    ) {
      if (this.previousCell && !this.previousCell.isDisposed) {
        this.removeListener(this.previousCell);
        this.clearGutter(this.previousCell);
        this.breakpointsModel.breakpoints = [];
      }
      this.previousCell = this.activeCell;
      this.setEditor(this.activeCell);
    }
  }

  protected setEditor(cell: CodeCell) {
    if (!cell || !cell.editor) {
      return;
    }

    const editor = cell.editor as CodeMirrorEditor;

    this.previousLineCount = editor.lineCount;

    editor.setOption('lineNumbers', true);
    editor.editor.setOption('gutters', [
      'CodeMirror-linenumbers',
      'breakpoints'
    ]);

    editor.editor.on('gutterClick', this.onGutterClick);
    editor.editor.on('renderLine', this.onNewRenderLine);
  }

  protected removeListener(cell: CodeCell) {
    const editor = cell.editor as CodeMirrorEditor;
    editor.setOption('lineNumbers', false);
    editor.editor.off('gutterClick', this.onGutterClick);
    editor.editor.off('renderLine', this.onNewRenderLine);
  }

  protected getEditorId(): string {
    return this.activeCell.editor.uuid;
  }

  protected onGutterClick = (editor: Editor, lineNumber: number) => {
    const info = editor.lineInfo(lineNumber);
    if (!info) {
      return;
    }

    const isRemoveGutter = !!info.gutterMarkers;
    if (isRemoveGutter) {
      this.breakpointsModel.removeBreakpoint(info as ILineInfo);
    } else {
      this.breakpointsModel.addBreakpoint(
        this._debuggerModel.session.client.name,
        this.getEditorId(),
        info as ILineInfo
      );
    }

    editor.setGutterMarker(
      lineNumber,
      'breakpoints',
      isRemoveGutter ? null : this.createMarkerNode()
    );
  };

  protected onNewRenderLine = (editor: Editor, line: any) => {
    const lineInfo = editor.lineInfo(line);
    if (lineInfo.handle && lineInfo.handle.order === false) {
      return;
    }
    const doc: Doc = editor.getDoc();
    const linesNumber = doc.lineCount();
    if (this.previousLineCount !== linesNumber) {
      let lines: ILineInfo[] = [];
      doc.eachLine(line => {
        if ((line as ILineInfo).gutterMarkers) {
          lines.push(editor.lineInfo(line));
        }
      });
      this.breakpointsModel.changeLines(lines);
      this.previousLineCount = linesNumber;
    }
  };

  private createMarkerNode() {
    let marker = document.createElement('div');
    marker.className = 'jp-breakpoint-marker';
    marker.innerHTML = '●';
    return marker;
  }
}

export namespace CellManager {
  export interface IOptions {
    debuggerModel: Debugger.Model;
    breakpointsModel: Breakpoints.Model;
    activeCell?: CodeCell;
    type: SessionTypes;
  }
}

export interface ILineInfo {
  line: any;
  handle: any;
  text: string;
  /** Object mapping gutter IDs to marker elements. */
  gutterMarkers: any;
  textClass: string;
  bgClass: string;
  wrapClass: string;
  /** Array of line widgets attached to this line. */
  widgets: any;
}