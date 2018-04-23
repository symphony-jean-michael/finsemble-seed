/*!
* Copyright 2017 by ChartIQ, Inc.
* All rights reserved.
*/
import React from "react";
import "../assets/css/finfont.css";
import "../assets/css/finsemble.css";
import "./menu.css";



export default class ComplexMenu extends React.Component {
	constructor() {
		super();
		this.bindCorrectContext();
		this.state = {
			activeSection: this.props && this.props.activeSection ? this.props.activeSection : ''
		}
	}
	componentWillMount() {
		this.setState({ activeSection: this.props && this.props.activeSection ? this.props.activeSection : '' })//Props did not exist in the contructor
	}
	bindCorrectContext() {
		this.setActiveSection = this.setActiveSection.bind(this);
	}

	setActiveSection(sectionName) {
		this.setState({
			activeSection: sectionName
		});
	}
	hideWindow() {
		FSBL.Clients.WindowClient.finsembleWindow.close();
		FSBL.Clients.DialogManager.hideModal();

	}
	render() {
		if (!this.props.navOptions) return null;
		var self = this;
		let navEntries = this.props.navOptions;
		var activeContent = [];
		console.log("self.props.headerImgUrl", self.props.headerImgUrl);
		let headerImgStyle = {
			paddingLeft: self.props.headerImgUrl === "" ? "10px" : "0px"
		};
		return (<div className="user-preferences" >
			<div className="complex-menu-wrapper">
				<div className="container">
					<div className="complex-menu-left-nav">
						<div className="complex-menu-left-nav-header" style={headerImgStyle}>
							{self.props.headerImgUrl !== "" && <img className="complex-menu-left-nav-header-img" src={self.props.headerImgUrl} />} {this.props.title}
						</div>
						{
							navEntries.map((el, i) => {
								let sectionToggleClasses = "complex-menu-section-toggle";
								if (el.label === this.state.activeSection) {
									sectionToggleClasses += " active-section-toggle";
									activeContent.push(<div className="conatinerItem active">{el.content}</div>);
								} else {
									activeContent.push(<div className="conatinerItem">{el.content}</div>);
								}
								return <div className={sectionToggleClasses} key={i} onClick={() => {
									self.setActiveSection(el.label);
								}}>
									{el.label}
								</div>
							})
						}
					</div>

					<div className="content">
						<div className="complex-menu-header">
							<div onClick={this.hideWindow} className="ff-close complex-menu-close"></div>
						</div>
						{activeContent}
					</div>
				</div>

			</div>
		</div>);
	}
}