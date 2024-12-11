import { Column, Entity, Index, PrimaryGeneratedColumn } from "typeorm";
import { TABLE } from "../constants/table";

@Index(['messageId', 'userId'])
@Entity(TABLE.W2_REQUEST)
export class W2Requests {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "text" })
  messageId: string;

  @Column({ type: "text", nullable: true})
  userId: string;

  @Column({ type: "text", nullable: true })
  clanId: string;

  @Column({ type: "text", nullable: true })
  channelId: string;

  @Column({ nullable: true })
  isChannelPublic: boolean;

  @Column({ nullable: true })
  modeMessage: number;

  @Column({ nullable: true })
  payment: number;

  @Column({ nullable: true })
  amount: number;

  @Column({ type: 'numeric', nullable: true })
  createdAt: number;

  @Column({ type: 'text', nullable: true })
  workflowId: string;

  @Column({ type: 'text', nullable: true })
  email: string;

  @Column({ type: 'text', nullable: true })
  Id: object;
}
