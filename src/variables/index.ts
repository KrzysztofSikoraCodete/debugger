// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { ToolbarButton } from '@jupyterlab/apputils';

import { CommandRegistry } from '@lumino/commands';

import { Panel, Widget } from '@lumino/widgets';

import { VariablesBodyGrid, VariablesGrid } from './grid';

import { VariablesHeader } from './header';

import { VariablesModel } from './model';

import { IDebugger } from '../tokens';

import { VariablesBodyTree } from './tree';

/**
 * A Panel to show a variable explorer.
 */
export class Variables extends Panel {
  /**
   * Instantiate a new Variables Panel.
   * @param options The instantiation options for a Variables Panel.
   */
  constructor(options: Variables.IOptions) {
    super();

    const { model, service, commands } = options;

    this._header = new VariablesHeader();
    this._tree = new VariablesBodyTree({ model, service });
    this._table = new VariablesBodyGrid({ model, commands });
    this._table.hide();

    const onClick = () => {
      if (this._table.isHidden) {
        this._tree.hide();
        this._table.show();
        this.node.setAttribute('data-jp-table', 'true');
      } else {
        this._tree.show();
        this._table.hide();
        this.node.removeAttribute('data-jp-table');
      }
      this.update();
    };

    this._header.toolbar.addItem(
      'view-VariableSwitch',
      new ToolbarButton({
        iconClass: 'jp-ToggleSwitch',
        onClick,
        tooltip: 'Table / Tree View'
      })
    );

    this.addWidget(this._header);
    this.addWidget(this._tree);
    this.addWidget(this._table);
    this.addClass('jp-DebuggerVariables');
  }

  /**
   * Set the variable filter for both the tree and table views.
   */
  set filter(filter: Set<string>) {
    this._tree.filter = filter;
    this._table.filter = filter;
  }

  /**
   * Set the theme for the variable table.
   */
  set theme(theme: VariablesGrid.Theme) {
    this._table.theme = theme;
  }

  /**
   * A message handler invoked on a `'resize'` message.
   */
  protected onResize(msg: Widget.ResizeMessage): void {
    super.onResize(msg);
    this._resizeBody(msg);
  }

  /**
   * Resize the body.
   * @param msg The resize message.
   */
  private _resizeBody(msg: Widget.ResizeMessage) {
    const height = msg.height - this._header.node.offsetHeight;
    this._tree.node.style.height = `${height}px`;
  }

  private _header: VariablesHeader;
  private _tree: VariablesBodyTree;
  private _table: VariablesBodyGrid;
}

/**
 * Convert a variable to a primitive type.
 * @param variable The variable.
 */
export const convertType = (variable: VariablesModel.IVariable) => {
  const { type, value } = variable;
  switch (type) {
    case 'int':
      return parseInt(value, 10);
    case 'float':
      return parseFloat(value);
    case 'bool':
      return value;
    case 'str':
      return value.slice(1, value.length - 1);
    default:
      return type;
  }
};

/**
 * A namespace for Variables `statics`.
 */
export namespace Variables {
  /**
   * Instantiation options for `Variables`.
   */
  export interface IOptions extends Panel.IOptions {
    /**
     * The variables model.
     */
    model: VariablesModel;
    /**
     * The debugger service.
     */
    service: IDebugger;
    /**
     * The commands registry.
     */
    commands: CommandRegistry;
  }
}
