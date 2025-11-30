import React from 'react';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import './Card.css';

const Card = ({ title, content }) => {
    return (
        <motion.div
            className="card-container"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{
                x: { type: "spring", stiffness: 300, damping: 30 },
                opacity: { duration: 0.2 }
            }}
        >
            <h2 className="card-title">{title}</h2>
            <div className="card-content">
                <ReactMarkdown>{content}</ReactMarkdown>
            </div>
        </motion.div>
    );
};

export default Card;
