//
// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license.
//
// Microsoft Bot Framework: http://botframework.com
//
// Bot Framework Emulator Github:
// https://github.com/Microsoft/BotFramwork-Emulator
//
// Copyright (c) Microsoft Corporation
// All rights reserved.
//
// MIT License:
// Permission is hereby granted, free of charge, to any person obtaining
// a copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to
// permit persons to whom the Software is furnished to do so, subject to
// the following conditions:
//
// The above copyright notice and this permission notice shall be
// included in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED ""AS IS"", WITHOUT WARRANTY OF ANY KIND,
// EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
// NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
// LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
// OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
// WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
//

import * as React from 'react';
import { DragEvent } from 'react';
import * as styles from './tabBar.scss';
import * as Constants from '../../../../constants';
import { getOtherTabGroup } from '../../../../data/editorHelpers';
import { Document, Editor } from '../../../../data/reducer/editor';
import {
  CONTENT_TYPE_APP_SETTINGS,
  CONTENT_TYPE_LIVE_CHAT,
  CONTENT_TYPE_TRANSCRIPT,
  CONTENT_TYPE_WELCOME_PAGE
} from '../../../../constants';
import { BotConfigWithPath } from '@bfemulator/sdk-shared';
import { Tab } from '../tab/tab';

export interface TabBarProps {
  activeBot?: BotConfigWithPath;
  activeDocumentId?: string;
  activeEditor?: string;
  chats?: { [chatId: string]: any };
  documents?: { [documentId: string]: Document };
  editors?: { [editorKey: string]: Editor };
  owningEditor?: string;
  tabOrder?: string[];
  splitTab?: (contentType: string, documentId: string, srcEditorKey: string, destEditorKey: string) => void;
  appendTab?: (srcEditorKey: string, destEditorKey: string, tabId: string) => void;
  enablePresentationMode?: () => void;
  setActiveTab?: (documentId: string) => void;
  closeTab?: (documentId: string) => void;
}

export interface TabBarState {
  draggedOver: boolean;
}

export class TabBar extends React.Component<TabBarProps, TabBarState> {
  private readonly childRefs: HTMLElement[] = [];
  private _scrollable: HTMLElement;
  private activeIndex: number;

  constructor(props: TabBarProps) {
    super(props);

    const activeIndex = props.tabOrder.findIndex(docId => docId === props.activeDocumentId);
    this.activeIndex = activeIndex === -1 ? 0 : activeIndex;

    this.state = {
      draggedOver: false
    };
  }

  public componentDidUpdate(prevProps: TabBarProps) {
    let scrollable = this._scrollable;
    const activeIndex = this.props.tabOrder.findIndex(docId => docId === this.props.activeDocumentId);
    this.activeIndex = activeIndex === -1 ? 0 : activeIndex;

    if (scrollable) {
      if (this.props.tabOrder.length > prevProps.tabOrder.length &&
        scrollable.scrollWidth > scrollable.clientWidth) {
        let leftOffset = 0;
        for (let i = 0; i <= this.activeIndex; i++) {
          const ref = this.childRefs[i];
          leftOffset += ref ? this.childRefs[i].offsetWidth : 0;
        }
        if (leftOffset >= scrollable.clientWidth) {
          scrollable.scrollLeft = leftOffset;
        }
      }
    }
  }

  public render() {
    const tabBarClassName = this.state.draggedOver ? styles.draggedOver : '';
    return (
      <div
        className={ `${ styles.tabBar } ${ tabBarClassName }` }
        onDragEnter={ this.onDragEnter }
        onDragOver={ this.onDragOver }
        onDragLeave={ this.onDragLeave }
        onDrop={ this.onDrop }>
        <div className={ styles.tabBarTabs } ref={ this.saveScrollable }>
          { this.tabs }
        </div>
        <div className={ styles.tabBarWidgets }>
          { this.widgets }
        </div>
      </div>
    );
  }

  private onPresentationModeClick = () => this.props.enablePresentationMode();

  private get widgets(): JSX.Element[] {
    const activeDoc = this.props.documents[this.props.activeDocumentId];
    const presentationEnabled = activeDoc
      && (activeDoc.contentType === Constants.CONTENT_TYPE_TRANSCRIPT ||
        activeDoc.contentType === Constants.CONTENT_TYPE_LIVE_CHAT);
    const splitEnabled = Object.keys(this.props.documents).length > 1;

    const widgets: JSX.Element[] = [];

    if (presentationEnabled) {
      widgets.push(
        <button
          key={ 'presentation-widget' }
          title="Presentation Mode"
          onClick={ () => this.onPresentationModeClick() }
        >
          <div className={ `${ styles.widget } ${ styles.presentationWidget }` }>
          </div>
        </button>

      );
    }
    if (splitEnabled) {
      widgets.push(
        <button
          key={ 'split-widget' }
          title="Split Editor"
          onClick={ this.onSplitClick }
        >
          <div className={ `${ styles.widget } ${ styles.splitWidget }` }>
          </div>
        </button>
      );
    }
    return widgets;
  }

  private get tabs(): JSX.Element[] {
    return this.props.tabOrder.map((documentId, index) => {
      const document = this.props.documents[documentId];
      const isActive = documentId === this.props.activeDocumentId;

      return (
        <div 
          key={ documentId }
          className="tab-container"
          onClick={ _ev => this.handleTabClick(index) }
          onKeyDown={ ev => this.handleKeyDown(ev, index) }
          ref={ this.setRef } role="presentation">
          <Tab
            active={ isActive }
            dirty={ document.dirty }
            documentId={ documentId }
            label={ this.getTabLabel(document) }
            onCloseClick={ this.props.closeTab }/>
        </div>
      );
    });
  }
  
  private handleTabClick = (tabIndex: number) => {
    this.props.setActiveTab(this.props.tabOrder[tabIndex]);
  }

  private handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>, tabIndex: number): void => {
    let { key = '' } = event;
    key = key.toLowerCase();
    if (key === ' ' || key === 'enter') {
      this.handleTabClick(tabIndex); 
    }
  }

  private onSplitClick = () => {
    const owningEditor = this.props.editors[this.props.owningEditor];
    const docIdToSplit = owningEditor.activeDocumentId;
    const docToSplit = owningEditor.documents[docIdToSplit];
    const destEditorKey = getOtherTabGroup(this.props.owningEditor);
    this.props.splitTab(docToSplit.contentType, docToSplit.documentId, this.props.owningEditor, destEditorKey);
  }

  private onDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  }

  private onDragOver = (e: DragEvent<HTMLDivElement>) => {
    this.setState(({ draggedOver: true }));
    e.preventDefault();
    e.stopPropagation();
  }

  private onDragLeave = (_e: DragEvent<HTMLDivElement>) => {
    this.setState(({ draggedOver: false }));
  }

  private onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    this.setState(({ draggedOver: false }));
    try {
      const tabData = JSON.parse(e.dataTransfer.getData('application/json'));
      const tabId = tabData.tabId;
      this.props.appendTab(tabData.editorKey, this.props.owningEditor, tabId);
    } catch {
      // Do nothing
    }
  }

  private saveScrollable = (ref) => {
    this._scrollable = ref;
  }

  private setRef = (tabRef: HTMLElement) => {
    this.childRefs.push(tabRef);
  }
  
  private getTabLabel(document: Document): string {
    switch (document.contentType) {
      case CONTENT_TYPE_APP_SETTINGS:
        return 'Emulator Settings';

      case CONTENT_TYPE_WELCOME_PAGE:
        return 'Welcome';

      case CONTENT_TYPE_TRANSCRIPT:
        return document.fileName || 'Transcript';

      case CONTENT_TYPE_LIVE_CHAT:
        let label = 'Live Chat';
        const { services = [] } = this.props.activeBot || {};
        const { endpointId = null } = this.props.chats[document.documentId] || {};
        const botEndpoint = services.find(s => s.id === endpointId);

        if (botEndpoint) {
          label += ` (${ botEndpoint.name })`;
        }
        return label;

      default:
        return '';
    }
  }
}
